// Learning resource catalogue. Admins maintain it; learners read it and use
// the entries alongside their roadmaps.
const { pool } = require('../config/db');
const { escapeLike } = require('../utils/sql');

const RESOURCE_COLUMNS = `id, title, provider, url, description, resource_type,
  skill_tags, is_free, is_active, created_by, created_at, updated_at`;

const UPDATABLE_COLUMNS = [
  'title',
  'provider',
  'url',
  'description',
  'resource_type',
  'skill_tags',
  'is_free',
  'is_active',
];

function mapResource(row) {
  return row ? { ...row, is_free: Boolean(row.is_free), is_active: Boolean(row.is_active) } : null;
}

async function listResources(filters) {
  const { search, type, skill, is_active, page, limit } = filters;
  const conditions = [];
  const values = [];

  if (search) {
    const like = `%${escapeLike(search)}%`;
    values.push(like, like, like);
    const base = values.length - 2;
    conditions.push(
      `(title ILIKE $${base} ESCAPE '\\' OR provider ILIKE $${base + 1} ESCAPE '\\' OR description ILIKE $${base + 2} ESCAPE '\\')`
    );
  }
  if (type) { values.push(type); conditions.push(`resource_type = $${values.length}`); }
  if (skill) {
    values.push(`%${escapeLike(skill)}%`);
    conditions.push(`skill_tags ILIKE $${values.length} ESCAPE '\\'`);
  }
  if (is_active !== undefined) { values.push(is_active); conditions.push(`is_active = $${values.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const countValues = [...values];
  values.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT ${RESOURCE_COLUMNS} FROM learning_resources ${where}
     ORDER BY is_active DESC, updated_at DESC, id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) AS total FROM learning_resources ${where}`,
    countValues
  );

  return {
    resources: rows.map(mapResource),
    total: Number(countRows[0].total),
    page,
    limit,
  };
}

async function getResource(resourceId) {
  const { rows } = await pool.query(
    `SELECT ${RESOURCE_COLUMNS} FROM learning_resources WHERE id = $1`,
    [resourceId]
  );
  return mapResource(rows[0]);
}

async function createResource(adminId, data) {
  const columns = ['created_by'];
  const values = [adminId];

  for (const column of UPDATABLE_COLUMNS) {
    if (data[column] === undefined) continue;
    columns.push(column);
    values.push(data[column]);
  }

  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const { rows } = await pool.query(
    `INSERT INTO learning_resources (${columns.join(', ')}) VALUES (${placeholders})
     RETURNING ${RESOURCE_COLUMNS}`,
    values
  );
  return mapResource(rows[0]);
}

async function updateResource(resourceId, fields) {
  const columns = [];
  const values = [];

  for (const column of UPDATABLE_COLUMNS) {
    if (fields[column] === undefined) continue;
    values.push(fields[column]);
    columns.push(`${column} = $${values.length}`);
  }

  if (!columns.length) return getResource(resourceId);

  values.push(resourceId);
  const { rows } = await pool.query(
    `UPDATE learning_resources SET ${columns.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length} RETURNING ${RESOURCE_COLUMNS}`,
    values
  );
  return mapResource(rows[0]);
}

async function deleteResource(resourceId) {
  const { rowCount } = await pool.query(
    'DELETE FROM learning_resources WHERE id = $1',
    [resourceId]
  );
  return rowCount > 0;
}

module.exports = {
  listResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
};
