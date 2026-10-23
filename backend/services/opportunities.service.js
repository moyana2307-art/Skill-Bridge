// All database work for opportunities (jobs, internships, scholarships,
// training and courses) lives here.
const { pool } = require('../config/db');
const { escapeLike } = require('../utils/sql');

const OPPORTUNITY_COLUMNS = `
  id, title, organisation, description, opportunity_type, required_skills,
  location, is_remote, eligibility, application_deadline, application_url,
  source_name, is_demo, is_active, created_at, updated_at
`;

// Only these column names may be used in an UPDATE statement.
const UPDATABLE_COLUMNS = [
  'title',
  'organisation',
  'description',
  'opportunity_type',
  'required_skills',
  'location',
  'is_remote',
  'eligibility',
  'application_deadline',
  'application_url',
  'source_name',
  'is_demo',
  'is_active',
];

// Whitelist of ORDER BY columns, so the sort can never be injected.
const SORT_COLUMNS = {
  newest: 'created_at',
  deadline: 'application_deadline',
  title: 'title',
};

// Turns the database row into the shape the API returns.
function mapOpportunity(row) {
  if (!row) return null;

  return {
    ...row,
    is_remote: Boolean(row.is_remote),
    is_demo: Boolean(row.is_demo),
    is_active: Boolean(row.is_active),
  };
}

// GET /api/opportunities
async function listOpportunities(filters) {
  const { search, type, location, is_remote, is_active, include_demo, sort, order, page, limit } =
    filters;

  const conditions = [];
  const values = [];

  if (search) {
    const like = `%${escapeLike(search)}%`;
    conditions.push('(title LIKE ? OR organisation LIKE ? OR description LIKE ?)');
    values.push(like, like, like);
  }

  if (type) {
    conditions.push('opportunity_type = ?');
    values.push(type);
  }

  if (location) {
    conditions.push('location LIKE ?');
    values.push(`%${escapeLike(location)}%`);
  }

  if (is_remote !== undefined) {
    conditions.push('is_remote = ?');
    values.push(is_remote ? 1 : 0);
  }

  if (is_active !== undefined) {
    conditions.push('is_active = ?');
    values.push(is_active ? 1 : 0);
  }

  if (include_demo === false) {
    conditions.push('is_demo = 0');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const sortColumn = SORT_COLUMNS[sort] || SORT_COLUMNS.newest;
  const direction = order === 'asc' ? 'ASC' : 'DESC';

  // Deadlines that are still empty are pushed to the end of the list.
  const orderBy =
    sort === 'deadline'
      ? `ORDER BY application_deadline IS NULL ASC, application_deadline ${direction}, id ${direction}`
      : `ORDER BY ${sortColumn} ${direction}, id ${direction}`;

  const [rows] = await pool.execute(
    `SELECT ${OPPORTUNITY_COLUMNS} FROM opportunities ${where} ${orderBy} LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM opportunities ${where}`,
    values
  );

  return {
    rows: rows.map(mapOpportunity),
    total: Number(countRows[0].total),
    page,
    limit,
  };
}

// GET /api/opportunities/:id
async function getOpportunityById(id) {
  const [rows] = await pool.execute(`SELECT ${OPPORTUNITY_COLUMNS} FROM opportunities WHERE id = ?`, [
    id,
  ]);

  return mapOpportunity(rows[0]);
}

// POST /api/opportunities
async function createOpportunity(data) {
  const columns = [];
  const values = [];

  for (const column of UPDATABLE_COLUMNS) {
    if (data[column] === undefined) continue;
    columns.push(column);
    values.push(typeof data[column] === 'boolean' ? (data[column] ? 1 : 0) : data[column]);
  }

  const placeholders = columns.map(() => '?').join(', ');
  const [result] = await pool.execute(
    `INSERT INTO opportunities (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  return getOpportunityById(result.insertId);
}

// PATCH /api/opportunities/:id
async function updateOpportunity(id, fields) {
  const columns = [];
  const values = [];

  for (const column of UPDATABLE_COLUMNS) {
    if (fields[column] === undefined) continue;
    columns.push(`${column} = ?`);
    values.push(typeof fields[column] === 'boolean' ? (fields[column] ? 1 : 0) : fields[column]);
  }

  if (!columns.length) return getOpportunityById(id);

  values.push(id);
  const [result] = await pool.execute(
    `UPDATE opportunities SET ${columns.join(', ')} WHERE id = ?`,
    values
  );

  if (!result.affectedRows) return null;

  return getOpportunityById(id);
}

// DELETE /api/opportunities/:id
async function deleteOpportunity(id) {
  const [result] = await pool.execute('DELETE FROM opportunities WHERE id = ?', [id]);

  return result.affectedRows > 0;
}

const SAVED_OPPORTUNITY_SELECT = `
  SELECT o.*, so.saved_at
  FROM saved_opportunities so
  JOIN opportunities o ON o.id = so.opportunity_id
`;

// GET /api/opportunities/saved
async function listSavedOpportunities(userId) {
  const [rows] = await pool.execute(
    `${SAVED_OPPORTUNITY_SELECT}
     WHERE so.user_id = ?
     ORDER BY so.saved_at DESC, o.id DESC`,
    [userId]
  );

  return rows.map((row) => ({ ...mapOpportunity(row), saved: true }));
}

async function getSavedOpportunity(userId, opportunityId) {
  const [rows] = await pool.execute(
    `${SAVED_OPPORTUNITY_SELECT}
     WHERE so.user_id = ? AND so.opportunity_id = ?`,
    [userId, opportunityId]
  );

  return rows[0] ? { ...mapOpportunity(rows[0]), saved: true } : null;
}

async function listSavedIds(userId) {
  const [rows] = await pool.execute(
    'SELECT opportunity_id FROM saved_opportunities WHERE user_id = ?',
    [userId]
  );

  return new Set(rows.map((row) => Number(row.opportunity_id)));
}

// POST /api/opportunities/:id/save
async function saveOpportunity(userId, opportunityId) {
  const opportunity = await getOpportunityById(opportunityId);
  if (!opportunity) return { status: 'not_found' };

  const [result] = await pool.execute(
    'INSERT IGNORE INTO saved_opportunities (user_id, opportunity_id) VALUES (?, ?)',
    [userId, opportunityId]
  );

  return {
    status: result.affectedRows ? 'created' : 'already_saved',
    opportunity: await getSavedOpportunity(userId, opportunityId),
  };
}

// DELETE /api/opportunities/:id/save
async function removeSavedOpportunity(userId, opportunityId) {
  const [result] = await pool.execute(
    'DELETE FROM saved_opportunities WHERE user_id = ? AND opportunity_id = ?',
    [userId, opportunityId]
  );

  return result.affectedRows > 0;
}

// Skills are stored as free text on opportunities. Comma-separated names are
// compared with the user's catalogue skill names after normalising case and
// punctuation, so "React.js" and "react.js" count as the same skill.
function normalizeSkill(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.]/g, '');
}

function parseRequiredSkills(value) {
  if (!value) return [];

  const seen = new Set();
  const skills = [];

  for (const part of String(value).split(/[,;|\n]+/)) {
    const label = part.trim();
    const key = normalizeSkill(label);

    if (!key || seen.has(key)) continue;
    seen.add(key);
    skills.push(label);
  }

  return skills;
}

function deadlineKey(value) {
  return value || '9999-12-31';
}

// GET /api/opportunities/matches
// Scores active opportunities by how many required skills the user already
// has. The score is calculated here in JavaScript because required_skills is
// free text, not a join table.
async function listMatchingOpportunities(userId, filters) {
  const [userSkillRows] = await pool.execute(
    `SELECT s.name
     FROM user_skills us
     JOIN skills s ON s.id = us.skill_id
     WHERE us.user_id = ?`,
    [userId]
  );

  const userSkills = new Map(
    userSkillRows.map((row) => [normalizeSkill(row.name), row.name])
  );
  const savedIds = await listSavedIds(userId);

  // Fetch a generous first page, then score and sort by match percentage.
  const result = await listOpportunities({
    ...filters,
    page: 1,
    limit: 100,
    is_active: true,
    sort: 'deadline',
    order: 'asc',
  });

  const scored = result.rows.map((opportunity) => {
    const required = parseRequiredSkills(opportunity.required_skills);
    const matched = [];
    const missing = [];

    for (const skill of required) {
      if (userSkills.has(normalizeSkill(skill))) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    }

    return {
      ...opportunity,
      saved: savedIds.has(Number(opportunity.id)),
      match_score:
        required.length === 0
          ? null
          : Math.round((matched.length / required.length) * 100),
      required_skills_list: required,
      matched_skills: matched,
      missing_skills: missing,
    };
  });

  scored.sort((a, b) => {
    const scoreDifference = (b.match_score ?? -1) - (a.match_score ?? -1);
    if (scoreDifference) return scoreDifference;

    const deadlineDifference = deadlineKey(a.application_deadline).localeCompare(
      deadlineKey(b.application_deadline)
    );
    if (deadlineDifference) return deadlineDifference;

    return b.id - a.id;
  });

  const offset = (filters.page - 1) * filters.limit;

  return {
    rows: scored.slice(offset, offset + filters.limit),
    total: scored.length,
    page: filters.page,
    limit: filters.limit,
  };
}

module.exports = {
  listOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  listSavedOpportunities,
  saveOpportunity,
  removeSavedOpportunity,
  listMatchingOpportunities,
};
