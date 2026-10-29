const { pool } = require('../config/db');
const skillsService = require('./skills.service');

const USER_SKILL_SELECT = `SELECT us.skill_id, s.name, s.category, us.proficiency,
  us.created_at AS added_at FROM user_skills us JOIN skills s ON s.id = us.skill_id`;

async function listUserSkills(userId) {
  const { rows } = await pool.query(`${USER_SKILL_SELECT} WHERE us.user_id = $1 ORDER BY s.name ASC`, [userId]);
  return rows;
}

async function getUserSkill(userId, skillId) {
  const { rows } = await pool.query(`${USER_SKILL_SELECT} WHERE us.user_id = $1 AND us.skill_id = $2`, [userId, skillId]);
  return rows[0] || null;
}

async function addUserSkill(userId, skillId, proficiency) {
  const skill = await skillsService.getSkillById(skillId);
  if (!skill) return { status: 'skill_not_found' };
  try {
    await pool.query(
      'INSERT INTO user_skills (user_id, skill_id, proficiency) VALUES ($1, $2, $3)',
      [userId, skillId, proficiency]
    );
  } catch (err) {
    if (err.code === '23505') return { status: 'already_added' };
    if (err.code === '23503') return { status: 'skill_not_found' };
    throw err;
  }
  return { status: 'created', skill: await getUserSkill(userId, skillId) };
}

async function updateUserSkill(userId, skillId, proficiency) {
  const existing = await getUserSkill(userId, skillId);
  if (!existing) return null;
  await pool.query(
    'UPDATE user_skills SET proficiency = $1 WHERE user_id = $2 AND skill_id = $3',
    [proficiency, userId, skillId]
  );
  return getUserSkill(userId, skillId);
}

async function removeUserSkill(userId, skillId) {
  const result = await pool.query('DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2', [userId, skillId]);
  return result.rowCount > 0;
}

module.exports = { listUserSkills, getUserSkill, addUserSkill, updateUserSkill, removeUserSkill };
