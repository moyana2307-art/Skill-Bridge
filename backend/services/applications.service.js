// Application tracking: the user's own pipeline from saved to offer.
const { pool } = require('../config/db');
const opportunitiesService = require('./opportunities.service');
const notificationsService = require('./notifications.service');

const APPLICATION_COLUMNS = `id, user_id, opportunity_id, title, organisation, status,
  applied_at, deadline, notes, created_at, updated_at`;

const UPDATABLE_COLUMNS = [
  'title',
  'organisation',
  'status',
  'applied_at',
  'deadline',
  'notes',
  'opportunity_id',
];

function mapApplication(row) {
  return row || null;
}

function placeholders(count, start = 1) {
  return Array.from({ length: count }, (_, i) => `$${start + i}`).join(', ');
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const deadline = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(deadline.getTime())) return null;
  return Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

async function maybeCreateDeadlineReminder(userId, application) {
  if (!application?.deadline) return;
  if (['offer', 'rejected', 'withdrawn'].includes(application.status)) return;

  const days = daysUntil(application.deadline);
  if (days === null || days < 0 || days > 14) return;

  await notificationsService.notify(userId, {
    type: 'deadline',
    title: `Deadline soon: ${application.title}`,
    body:
      days === 0
        ? 'The application deadline is today.'
        : `The application deadline is in ${days} day${days === 1 ? '' : 's'}.`,
    link: '/applications',
  });
}

async function listApplications(userId, filters) {
  const conditions = ['user_id = $1'];
  const values = [userId];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }

  const { rows } = await pool.query(
    `SELECT ${APPLICATION_COLUMNS} FROM applications
     WHERE ${conditions.join(' AND ')}
     ORDER BY CASE status
       WHEN 'interviewing' THEN 1 WHEN 'applied' THEN 2 WHEN 'saved' THEN 3
       WHEN 'offer' THEN 4 WHEN 'rejected' THEN 5 ELSE 6 END,
       updated_at DESC, id DESC`,
    values
  );

  return rows.map(mapApplication);
}

async function getApplication(userId, applicationId) {
  const { rows } = await pool.query(
    `SELECT ${APPLICATION_COLUMNS} FROM applications WHERE id = $1 AND user_id = $2`,
    [applicationId, userId]
  );
  return mapApplication(rows[0]);
}

async function createApplication(userId, data) {
  let { title, organisation, deadline } = data;

  if (data.opportunity_id) {
    const opportunity = await opportunitiesService.getOpportunityById(data.opportunity_id);
    if (!opportunity) return { status: 'opportunity_not_found' };

    title = title || opportunity.title;
    organisation = organisation || opportunity.organisation;
    deadline = deadline || opportunity.application_deadline;
  }

  if (!title) {
    return { status: 'title_required' };
  }

  const columns = ['user_id', 'title', 'organisation', 'status', 'applied_at', 'deadline', 'notes'];
  const values = [
    userId,
    title,
    organisation ?? null,
    data.status || 'saved',
    data.applied_at ?? null,
    deadline ?? null,
    data.notes ?? null,
  ];

  if (data.opportunity_id) {
    columns.push('opportunity_id');
    values.push(data.opportunity_id);
  }

  const { rows } = await pool.query(
    `INSERT INTO applications (${columns.join(', ')}) VALUES (${placeholders(values.length)})
     RETURNING ${APPLICATION_COLUMNS}`,
    values
  );

  const application = mapApplication(rows[0]);
  await maybeCreateDeadlineReminder(userId, application);

  return { status: 'created', application };
}

async function updateApplication(userId, applicationId, fields) {
  const existing = await getApplication(userId, applicationId);
  if (!existing) return { status: 'not_found' };

  if (fields.opportunity_id != null) {
    const opportunity = await opportunitiesService.getOpportunityById(fields.opportunity_id);
    if (!opportunity) return { status: 'opportunity_not_found' };
  }

  const columns = [];
  const values = [];

  for (const column of UPDATABLE_COLUMNS) {
    if (fields[column] === undefined) continue;
    values.push(fields[column]);
    columns.push(`${column} = $${values.length}`);
  }

  if (columns.length) {
    values.push(applicationId, userId);
    await pool.query(
      `UPDATE applications SET ${columns.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
      values
    );
  }

  const application = await getApplication(userId, applicationId);
  await maybeCreateDeadlineReminder(userId, application);

  return { status: 'updated', application };
}

async function deleteApplication(userId, applicationId) {
  const { rowCount } = await pool.query(
    'DELETE FROM applications WHERE id = $1 AND user_id = $2',
    [applicationId, userId]
  );
  return rowCount > 0;
}

async function summary(userId) {
  const { rows } = await pool.query(
    `SELECT status, COUNT(*) AS count FROM applications WHERE user_id = $1 GROUP BY status`,
    [userId]
  );
  const counts = Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  return {
    total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    by_status: counts,
  };
}

module.exports = {
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  summary,
};
