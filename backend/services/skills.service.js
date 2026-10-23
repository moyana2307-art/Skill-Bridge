// All database work for the skills catalogue lives here.
// The controllers call these functions; they never touch SQL directly.
const { pool } = require('../config/db');
const { escapeLike } = require('../utils/sql');

const SKILL_COLUMNS = 'id, name, category, created_at';

// GET /api/skills
async function listSkills({ search, category, page, limit }) {
  const conditions = [];
  const values = [];

  if (search) {
    const like = `%${escapeLike(search)}%`;
    conditions.push('(name LIKE ? OR category LIKE ?)');
    values.push(like, like);
  }

  if (category) {
    conditions.push('category = ?');
    values.push(category);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(
    `SELECT ${SKILL_COLUMNS} FROM skills ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM skills ${where}`, values);

  return { rows, total: Number(countRows[0].total), page, limit };
}

// GET /api/skills/:id
async function getSkillById(id) {
  const [rows] = await pool.execute(`SELECT ${SKILL_COLUMNS} FROM skills WHERE id = ?`, [id]);

  return rows[0] || null;
}

// POST /api/skills
async function createSkill({ name, category }) {
  const [result] = await pool.execute(
    'INSERT INTO skills (name, category) VALUES (?, ?)',
    [name, category ?? null]
  );

  return getSkillById(result.insertId);
}

// PATCH /api/skills/:id
async function updateSkill(id, fields) {
  const allowed = ['name', 'category'];
  const columns = [];
  const values = [];

  for (const field of allowed) {
    if (fields[field] === undefined) continue;
    columns.push(`${field} = ?`);
    values.push(fields[field]);
  }

  if (!columns.length) return getSkillById(id);

  values.push(id);
  const [result] = await pool.execute(`UPDATE skills SET ${columns.join(', ')} WHERE id = ?`, values);

  if (!result.affectedRows) return null;

  return getSkillById(id);
}

// DELETE /api/skills/:id
async function deleteSkill(id) {
  const [result] = await pool.execute('DELETE FROM skills WHERE id = ?', [id]);

  return result.affectedRows > 0;
}

// GET /api/meta - the list of categories that already exist.
async function listCategories() {
  const [rows] = await pool.execute(
    `SELECT DISTINCT category FROM skills
     WHERE category IS NOT NULL AND category <> ''
     ORDER BY category ASC`
  );

  return rows.map((row) => row.category);
}

module.exports = {
  listSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
  listCategories,
};
