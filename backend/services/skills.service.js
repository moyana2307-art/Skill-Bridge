const { pool } = require('../config/db');
const { escapeLike } = require('../utils/sql');

const SKILL_COLUMNS = 'id, name, category, created_at';

async function listSkills({ search, category, page, limit }) {
  const conditions = [];
  const values = [];
  if (search) {
    const like = `%${escapeLike(search)}%`;
    values.push(like, like);
    conditions.push(`(name ILIKE $${values.length - 1} ESCAPE '\\' OR category ILIKE $${values.length} ESCAPE '\\')`);
  }
  if (category) {
    values.push(category);
    conditions.push(`category = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const countValues = [...values];
  values.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT ${SKILL_COLUMNS} FROM skills ${where} ORDER BY name ASC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  const { rows: countRows } = await pool.query(`SELECT COUNT(*) AS total FROM skills ${where}`, countValues);
  return { rows, total: Number(countRows[0].total), page, limit }; 
}

async function getSkillById(id) {
  const { rows } = await pool.query(`SELECT ${SKILL_COLUMNS} FROM skills WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createSkill({ name, category }) {
  const { rows } = await pool.query(
    'INSERT INTO skills (name, category) VALUES ($1, $2) RETURNING id',
    [name, category ?? null]
  );
  return getSkillById(rows[0].id);
}

async function updateSkill(id, fields) {
  const allowed = ['name', 'category'];
  const columns = [];
  const values = [];
  for (const field of allowed) {
    if (fields[field] === undefined) continue;
    values.push(fields[field]);
    columns.push(`${field} = $${values.length}`);
  }
  if (!columns.length) return getSkillById(id);
  values.push(id);
  const result = await pool.query(`UPDATE skills SET ${columns.join(', ')} WHERE id = $${values.length}`, values);
  if (!result.rowCount) return null;
  return getSkillById(id);
}

async function deleteSkill(id) {
  const result = await pool.query('DELETE FROM skills WHERE id = $1', [id]);
  return result.rowCount > 0;
}

async function listCategories() {
  const { rows } = await pool.query(
    `SELECT DISTINCT category FROM skills
     WHERE category IS NOT NULL AND category <> ''
     ORDER BY category ASC`
  );
  return rows.map((row) => row.category);
}

module.exports = { listSkills, getSkillById, createSkill, updateSkill, deleteSkill, listCategories };
