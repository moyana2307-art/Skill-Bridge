// Database work for the skills saved on a user's profile.
// Every function receives the user id from the auth token, so the queries can
// only touch that user's rows.
const { pool } = require('../config/db');
const skillsService = require('./skills.service');

const USER_SKILL_SELECT = `
  SELECT us.skill_id, s.name, s.category, us.proficiency,
         us.created_at AS added_at
  FROM user_skills us
  JOIN skills s ON s.id = us.skill_id
`;

async function listUserSkills(userId) {
  const [rows] = await pool.execute(
    `${USER_SKILL_SELECT} WHERE us.user_id = ? ORDER BY s.name ASC`,
    [userId]
  );

  return rows;
}

async function getUserSkill(userId, skillId) {
  const [rows] = await pool.execute(
    `${USER_SKILL_SELECT} WHERE us.user_id = ? AND us.skill_id = ?`,
    [userId, skillId]
  );

  return rows[0] || null;
}

// Returns a status instead of throwing so the controller can choose the
// correct HTTP response for "missing skill" and "already added".
async function addUserSkill(userId, skillId, proficiency) {
  const skill = await skillsService.getSkillById(skillId);

  if (!skill) return { status: 'skill_not_found' };

  try {
    await pool.execute(
      'INSERT INTO user_skills (user_id, skill_id, proficiency) VALUES (?, ?, ?)',
      [userId, skillId, proficiency]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return { status: 'already_added' };
    if (err.code === 'ER_NO_REFERENCED_ROW_2') return { status: 'skill_not_found' };
    throw err;
  }

  return { status: 'created', skill: await getUserSkill(userId, skillId) };
}

async function updateUserSkill(userId, skillId, proficiency) {
  const existing = await getUserSkill(userId, skillId);
  if (!existing) return null;

  await pool.execute(
    'UPDATE user_skills SET proficiency = ? WHERE user_id = ? AND skill_id = ?',
    [proficiency, userId, skillId]
  );

  return getUserSkill(userId, skillId);
}

async function removeUserSkill(userId, skillId) {
  const [result] = await pool.execute(
    'DELETE FROM user_skills WHERE user_id = ? AND skill_id = ?',
    [userId, skillId]
  );

  return result.affectedRows > 0;
}

module.exports = {
  listUserSkills,
  getUserSkill,
  addUserSkill,
  updateUserSkill,
  removeUserSkill,
};
