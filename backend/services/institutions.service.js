// Institutions let a university, college, NGO, or training provider manage a
// group of learners and see aggregate progress without exposing private data
// to other members.
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { escapeLike } = require('../utils/sql');
const { INSTITUTION_PACKAGES } = require('../config/plans');
const notificationsService = require('./notifications.service');
const subscriptionsService = require('./subscriptions.service');

const INSTITUTION_COLUMNS = `id, name, slug, contact_email, package_code, seat_limit,
  status, owner_user_id, created_at, updated_at`;

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function uniqueSlug(name) {
  const base = slugify(name) || 'institution';
  let candidate = base;
  let suffix = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rows } = await pool.query(
      'SELECT 1 FROM institutions WHERE slug = $1',
      [candidate]
    );
    if (!rows.length) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`.slice(0, 100);
  }
}

function mapInstitution(row) {
  if (!row) return null;
  return {
    ...row,
    seat_limit: Number(row.seat_limit),
    seat_used: row.seat_used === undefined ? undefined : Number(row.seat_used),
    seat_available:
      row.seat_used === undefined
        ? undefined
        : Math.max(0, Number(row.seat_limit) - Number(row.seat_used)),
  };
}

async function getMembership(userId, institutionId) {
  const { rows } = await pool.query(
    `SELECT id, institution_id, user_id, role, status, created_at
     FROM institution_members
     WHERE institution_id = $1 AND user_id = $2 AND status = 'active'`,
    [institutionId, userId]
  );
  return rows[0] || null;
}

async function requireAdminMembership(userId, institutionId) {
  const membership = await getMembership(userId, institutionId);
  if (!membership || membership.role !== 'admin') {
    throw ApiError.forbidden('Only institution administrators can do that.');
  }
  return membership;
}

async function getInstitutionRow(institutionId) {
  const { rows } = await pool.query(
    `SELECT i.*, 
       (SELECT COUNT(*) FROM institution_members m
        WHERE m.institution_id = i.id AND m.status = 'active') AS seat_used
     FROM institutions i WHERE i.id = $1`,
    [institutionId]
  );
  return mapInstitution(rows[0]);
}

async function listForUser(userId) {
  const { rows } = await pool.query(
    `SELECT i.id, i.name, i.slug, i.contact_email, i.package_code, i.seat_limit,
       i.status, i.owner_user_id, i.created_at, i.updated_at,
       m.role AS member_role, m.status AS member_status, m.created_at AS joined_at,
       (SELECT COUNT(*) FROM institution_members x
        WHERE x.institution_id = i.id AND x.status = 'active') AS seat_used
     FROM institutions i
     JOIN institution_members m ON m.institution_id = i.id
     WHERE m.user_id = $1 AND m.status = 'active'
     ORDER BY i.created_at DESC, i.id DESC`,
    [userId]
  );
  return rows.map((row) => ({
    ...mapInstitution(row),
    member_role: row.member_role,
    member_status: row.member_status,
    joined_at: row.joined_at,
  }));
}

async function assignInstitutionPlanIfEligible(userId, institutionId) {
  const { plan, subscription } = await subscriptionsService.getEffectivePlan(userId);

  // Never overwrite a plan the member already pays for. They keep Plus or
  // Premium, and removal from the institution will not downgrade them.
  if (plan.code === 'plus' || plan.code === 'premium') {
    return { assigned: false, reason: 'existing_paid_plan' };
  }

  if (
    plan.code === 'institution' &&
    String(subscription?.institution_id) === String(institutionId)
  ) {
    return { assigned: true, reason: 'already_assigned' };
  }

  await subscriptionsService.assignPlan(userId, 'institution', {
    source: 'institution',
    institutionId,
  });
  return { assigned: true, reason: 'assigned' };
}

async function createInstitution(userId, { name, contact_email: contactEmail, package_code: packageCode, seat_limit: seatLimit }) {
  const packageDef = INSTITUTION_PACKAGES[packageCode] || INSTITUTION_PACKAGES.small;
  const limit = seatLimit || packageDef.seat_limit;
  const slug = await uniqueSlug(name);

  const client = await pool.connect();
  let institution;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO institutions
         (name, slug, contact_email, package_code, seat_limit, status, owner_user_id)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING ${INSTITUTION_COLUMNS}`,
      [name, slug, contactEmail || null, packageDef.code, limit, userId]
    );
    institution = rows[0];

    await client.query(
      `INSERT INTO institution_members (institution_id, user_id, role, status)
       VALUES ($1, $2, 'admin', 'active')`,
      [institution.id, userId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const { rows: admins } = await pool.query(
    "SELECT id FROM users WHERE role = 'admin'"
  );
  await notificationsService.notifyMany(
    admins.map((admin) => admin.id),
    {
      type: 'announcement',
      title: 'New institution request',
      body: `${institution.name} requested an institution account. Review it in the admin area.`,
      link: '/admin',
    }
  );

  return { ...mapInstitution({ ...institution, seat_used: 1 }), member_role: 'admin' };
}

async function updateInstitution(userId, institutionId, fields) {
  await requireAdminMembership(userId, institutionId);
  const institution = await getInstitutionRow(institutionId);
  if (!institution) return null;

  const columns = [];
  const values = [];

  // Status is admin-only. An institution administrator cannot self-activate a
  // pending institution or lift a suspension.
  for (const column of ['name', 'contact_email', 'package_code', 'seat_limit']) {
    if (fields[column] === undefined) continue;
    values.push(fields[column]);
    columns.push(`${column} = $${values.length}`);
  }

  if (fields.seat_limit !== undefined && fields.seat_limit < institution.seat_used) {
    throw ApiError.badRequest(
      `Seat limit cannot be lower than the ${institution.seat_used} active members.`
    );
  }

  if (!columns.length) return institution;

  values.push(institutionId);
  const { rows } = await pool.query(
    `UPDATE institutions SET ${columns.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length} RETURNING ${INSTITUTION_COLUMNS}`,
    values
  );

  const updated = mapInstitution(rows[0]);
  return { ...updated, seat_used: institution.seat_used, seat_available: Math.max(0, updated.seat_limit - institution.seat_used) };
}

async function listMembers(institutionId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, m.role, m.status, m.created_at AS joined_at,
       (SELECT COUNT(*) FROM user_skills us WHERE us.user_id = u.id) AS skill_count,
       (SELECT COUNT(*) FROM career_assessments ca WHERE ca.user_id = u.id) AS assessment_count,
       (SELECT COUNT(*) FROM learning_roadmaps lr WHERE lr.user_id = u.id) AS roadmap_count,
       (SELECT COUNT(*) FROM roadmap_tasks rt
        JOIN learning_roadmaps lr2 ON lr2.id = rt.roadmap_id
        WHERE lr2.user_id = u.id AND rt.status = 'completed') AS tasks_completed,
       (SELECT COUNT(*) FROM roadmap_tasks rt
        JOIN learning_roadmaps lr3 ON lr3.id = rt.roadmap_id
        WHERE lr3.user_id = u.id) AS tasks_total,
       (SELECT COUNT(*) FROM projects p
        WHERE p.user_id = u.id AND p.status = 'completed') AS projects_completed,
       (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id) AS application_count,
       (SELECT readiness_score FROM employability_snapshots es
        WHERE es.user_id = u.id ORDER BY snapshot_date DESC, id DESC LIMIT 1) AS readiness_score
     FROM institution_members m
     JOIN users u ON u.id = m.user_id
     WHERE m.institution_id = $1 AND m.status <> 'removed'
     ORDER BY CASE m.role WHEN 'admin' THEN 1 ELSE 2 END, u.name ASC`,
    [institutionId]
  );

  return rows.map((row) => {
    const tasksTotal = Number(row.tasks_total || 0);
    const tasksCompleted = Number(row.tasks_completed || 0);
    return {
      ...row,
      skill_count: Number(row.skill_count),
      assessment_count: Number(row.assessment_count),
      roadmap_count: Number(row.roadmap_count),
      tasks_completed: tasksCompleted,
      tasks_total: tasksTotal,
      roadmap_progress_percent: tasksTotal
        ? Math.round((tasksCompleted / tasksTotal) * 100)
        : 0,
      projects_completed: Number(row.projects_completed),
      application_count: Number(row.application_count),
      readiness_score:
        row.readiness_score === null ? null : Number(row.readiness_score),
    };
  });
}

async function dashboard(userId, institutionId) {
  await requireAdminMembership(userId, institutionId);
  const institution = await getInstitutionRow(institutionId);
  if (!institution) return null;

  const members = await listMembers(institutionId);
  const activeMembers = members.filter((member) => member.status === 'active');
  const readinessValues = activeMembers
    .map((member) => member.readiness_score)
    .filter((value) => value !== null);

  const totals = activeMembers.reduce(
    (acc, member) => {
      acc.assessments += member.assessment_count;
      acc.skills += member.skill_count;
      acc.roadmaps += member.roadmap_count;
      acc.tasks_completed += member.tasks_completed;
      acc.tasks_total += member.tasks_total;
      acc.projects_completed += member.projects_completed;
      acc.applications += member.application_count;
      return acc;
    },
    {
      assessments: 0,
      skills: 0,
      roadmaps: 0,
      tasks_completed: 0,
      tasks_total: 0,
      projects_completed: 0,
      applications: 0,
    }
  );

  return {
    institution,
    summary: {
      members: activeMembers.length,
      seat_limit: institution.seat_limit,
      seat_available: Math.max(0, institution.seat_limit - activeMembers.length),
      average_readiness: readinessValues.length
        ? Math.round(
            readinessValues.reduce((sum, value) => sum + value, 0) /
              readinessValues.length
          )
        : null,
      assessments: totals.assessments,
      skills: totals.skills,
      roadmaps: totals.roadmaps,
      tasks_completed: totals.tasks_completed,
      tasks_total: totals.tasks_total,
      roadmap_progress_percent: totals.tasks_total
        ? Math.round((totals.tasks_completed / totals.tasks_total) * 100)
        : 0,
      projects_completed: totals.projects_completed,
      applications: totals.applications,
    },
    members,
  };
}

async function addMember(userId, institutionId, { email, role = 'member' }) {
  await requireAdminMembership(userId, institutionId);
  const institution = await getInstitutionRow(institutionId);
  if (!institution) return { status: 'institution_not_found' };
  if (institution.status !== 'active') {
    throw ApiError.badRequest(
      'This institution is not active yet. A platform administrator must approve it first.'
    );
  }
  if (institution.seat_used >= institution.seat_limit) {
    throw ApiError.badRequest(
      `All ${institution.seat_limit} seats are in use. Increase the seat limit first.`
    );
  }

  const { rows: userRows } = await pool.query(
    'SELECT id, name, email FROM users WHERE email = $1',
    [String(email).toLowerCase()]
  );
  const member = userRows[0];
  if (!member) return { status: 'user_not_found', email };

  const { rows: existing } = await pool.query(
    'SELECT id, status FROM institution_members WHERE institution_id = $1 AND user_id = $2',
    [institutionId, member.id]
  );

  if (existing.length) {
    if (existing[0].status === 'active') {
      return { status: 'already_member', member };
    }
    await pool.query(
      `UPDATE institution_members SET status = 'active', role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [role, existing[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO institution_members (institution_id, user_id, role, status)
       VALUES ($1, $2, $3, 'active')`,
      [institutionId, member.id, role]
    );
  }

  const planResult = await assignInstitutionPlanIfEligible(member.id, institutionId);

  await notificationsService.notify(member.id, {
    type: 'announcement',
    title: `You joined ${institution.name}`,
    body:
      planResult.reason === 'existing_paid_plan'
        ? 'You are now a member of this institution. Your existing paid plan remains active.'
        : 'Your institution gave you access to SkillBridge AI. All plan features are unlocked.',
    link: '/billing',
  });

  return { status: 'added', member, plan_assigned: planResult.assigned };
}

async function bulkAddMembers(userId, institutionId, { emails }) {
  await requireAdminMembership(userId, institutionId);
  const results = [];

  for (const email of emails) {
    try {
      const result = await addMember(userId, institutionId, { email });
      results.push({ email, ...result });
    } catch (err) {
      results.push({ email, status: 'error', message: err.message });
    }
  }

  return {
    results,
    added: results.filter((result) => result.status === 'added').length,
    skipped: results.filter((result) => result.status !== 'added').length,
  };
}

async function removeMember(userId, institutionId, memberUserId) {
  await requireAdminMembership(userId, institutionId);
  const institution = await getInstitutionRow(institutionId);
  if (!institution) return null;

  if (String(institution.owner_user_id) === String(memberUserId)) {
    throw ApiError.badRequest('The institution owner cannot be removed.');
  }

  const { rows } = await pool.query(
    `UPDATE institution_members SET status = 'removed', updated_at = CURRENT_TIMESTAMP
     WHERE institution_id = $1 AND user_id = $2 AND status <> 'removed'
     RETURNING id, user_id`,
    [institutionId, memberUserId]
  );
  if (!rows.length) return null;

  const { rows: subscriptionRows } = await pool.query(
    `SELECT plan_code, source, institution_id FROM subscriptions WHERE user_id = $1`,
    [memberUserId]
  );
  const subscription = subscriptionRows[0];
  let downgraded = false;
  if (
    subscription &&
    subscription.source === 'institution' &&
    String(subscription.institution_id) === String(institutionId)
  ) {
    await subscriptionsService.resetToFree(memberUserId);
    downgraded = true;
  }

  await notificationsService.notify(memberUserId, {
    type: 'announcement',
    title: `You left ${institution.name}`,
    body: downgraded
      ? 'Your institution membership was removed. Your account remains active on the Free plan.'
      : 'Your institution membership was removed. Your existing plan remains unchanged.',
    link: '/billing',
  });

  return rows[0];
}

async function updateMemberRole(userId, institutionId, memberUserId, { role }) {
  await requireAdminMembership(userId, institutionId);
  const institution = await getInstitutionRow(institutionId);
  if (institution && String(institution.owner_user_id) === String(memberUserId)) {
    throw ApiError.badRequest('The institution owner must stay an administrator.');
  }

  const { rows } = await pool.query(
    `UPDATE institution_members SET role = $1, updated_at = CURRENT_TIMESTAMP
     WHERE institution_id = $2 AND user_id = $3 AND status = 'active'
     RETURNING id, institution_id, user_id, role, status`,
    [role, institutionId, memberUserId]
  );
  return rows[0] || null;
}

async function listAllInstitutions({ search, status, page, limit }) {
  const conditions = [];
  const values = [];

  if (search) {
    const like = `%${escapeLike(search)}%`;
    values.push(like, like);
    conditions.push(
      `(i.name ILIKE $${values.length - 1} ESCAPE '\\' OR i.contact_email ILIKE $${values.length} ESCAPE '\\')`
    );
  }
  if (status) {
    values.push(status);
    conditions.push(`i.status = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const countValues = [...values];
  values.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT i.id, i.name, i.slug, i.contact_email, i.package_code, i.seat_limit,
       i.status, i.owner_user_id, i.created_at,
       u.name AS owner_name, u.email AS owner_email,
       (SELECT COUNT(*) FROM institution_members m
        WHERE m.institution_id = i.id AND m.status = 'active') AS seat_used
     FROM institutions i
     LEFT JOIN users u ON u.id = i.owner_user_id
     ${where}
     ORDER BY i.created_at DESC, i.id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS total FROM institutions i ${where}`,
    countValues
  );

  return {
    institutions: rows.map(mapInstitution),
    total: Number(countRows[0].total),
    page,
    limit,
  };
}

async function syncInstitutionPlans(institutionId, active) {
  if (active) {
    const { rows: members } = await pool.query(
      `SELECT user_id FROM institution_members
       WHERE institution_id = $1 AND status = 'active'`,
      [institutionId]
    );
    for (const member of members) {
      await assignInstitutionPlanIfEligible(member.user_id, institutionId);
    }
    return;
  }

  const { rows: subscriptions } = await pool.query(
    `SELECT user_id FROM subscriptions
     WHERE institution_id = $1 AND source = 'institution'`,
    [institutionId]
  );
  for (const subscription of subscriptions) {
    await subscriptionsService.resetToFree(subscription.user_id);
  }
}

async function adminUpdateInstitution(institutionId, fields) {
  const existing = await getInstitutionRow(institutionId);
  if (!existing) return null;

  const columns = [];
  const values = [];

  for (const column of ['name', 'contact_email', 'package_code', 'seat_limit', 'status']) {
    if (fields[column] === undefined) continue;
    values.push(fields[column]);
    columns.push(`${column} = $${values.length}`);
  }

  if (!columns.length) return existing;

  values.push(institutionId);
  const { rows } = await pool.query(
    `UPDATE institutions SET ${columns.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length} RETURNING ${INSTITUTION_COLUMNS}`,
    values
  );

  const updated = mapInstitution(rows[0]);

  if (fields.status !== undefined && fields.status !== existing.status) {
    await syncInstitutionPlans(institutionId, fields.status === 'active');
  }

  return {
    ...updated,
    seat_used: existing.seat_used,
    seat_available: Math.max(0, updated.seat_limit - existing.seat_used),
  };
}

module.exports = {
  listForUser,
  createInstitution,
  updateInstitution,
  dashboard,
  addMember,
  bulkAddMembers,
  removeMember,
  updateMemberRole,
  listAllInstitutions,
  adminUpdateInstitution,
  getInstitutionRow,
};
