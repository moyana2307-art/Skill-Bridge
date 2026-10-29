const { pool } = require('../config/db');

const PROFILE_FIELDS = ['education_level','work_experience','career_interests','location','learning_preferences'];

function toAvatar(avatarData, avatarMime) {
  if (!avatarData || !avatarMime) return null;
  return `data:${avatarMime};base64,${Buffer.from(avatarData).toString('base64')}`;
}

async function getProfile(userId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            p.education_level, p.work_experience, p.career_interests,
            p.location, p.learning_preferences, p.avatar_data, p.avatar_mime,
            p.updated_at AS profile_updated_at
     FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`, [userId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    user: { id: row.id, name: row.name, email: row.email, role: row.role, created_at: row.created_at, avatar: toAvatar(row.avatar_data, row.avatar_mime) },
    profile: { education_level: row.education_level, work_experience: row.work_experience, career_interests: row.career_interests, location: row.location, learning_preferences: row.learning_preferences, updated_at: row.profile_updated_at },
  };
}

async function updateProfile(userId, changes) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (changes.name !== undefined) {
      await client.query('UPDATE users SET name = $1 WHERE id = $2', [changes.name, userId]);
    }
    const providedFields = PROFILE_FIELDS.filter((field) => changes[field] !== undefined);
    if (providedFields.length) {
      const columns = ['user_id', ...providedFields];
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      const values = [userId, ...providedFields.map((field) => changes[field])];
      const updates = providedFields.map((field) => `${field} = EXCLUDED.${field}`).join(', ');
      await client.query(
        `INSERT INTO user_profiles (${columns.join(', ')}) VALUES (${placeholders})
         ON CONFLICT (user_id) DO UPDATE SET ${updates}`,
        values
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getProfile(userId);
}

async function updateAvatar(userId, avatarData, avatarMime) {
  await pool.query(
    `INSERT INTO user_profiles (user_id, avatar_data, avatar_mime) VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET avatar_data = EXCLUDED.avatar_data, avatar_mime = EXCLUDED.avatar_mime`,
    [userId, avatarData, avatarMime]
  );
  return getProfile(userId);
}

async function removeAvatar(userId) {
  await pool.query('UPDATE user_profiles SET avatar_data = NULL, avatar_mime = NULL WHERE user_id = $1', [userId]);
  return getProfile(userId);
}

module.exports = { getProfile, updateProfile, updateAvatar, removeAvatar };
