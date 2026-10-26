const { pool } = require('../config/db');

const PROFILE_FIELDS = [
  'education_level',
  'work_experience',
  'career_interests',
  'location',
  'learning_preferences',
];

function toAvatar(avatarData, avatarMime) {
  if (!avatarData || !avatarMime) return null;

  return `data:${avatarMime};base64,${Buffer.from(avatarData).toString('base64')}`;
}

async function getProfile(userId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            p.education_level, p.work_experience, p.career_interests,
            p.location, p.learning_preferences, p.avatar_data, p.avatar_mime,
            p.updated_at AS profile_updated_at
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      created_at: row.created_at,
      avatar: toAvatar(row.avatar_data, row.avatar_mime),
    },
    profile: {
      education_level: row.education_level,
      work_experience: row.work_experience,
      career_interests: row.career_interests,
      location: row.location,
      learning_preferences: row.learning_preferences,
      updated_at: row.profile_updated_at,
    },
  };
}

// Only the fields the client actually sent are changed.
async function updateProfile(userId, changes) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (changes.name !== undefined) {
      await connection.execute('UPDATE users SET name = ? WHERE id = ?', [
        changes.name,
        userId,
      ]);
    }

    const providedFields = PROFILE_FIELDS.filter(
      (field) => changes[field] !== undefined
    );

    if (providedFields.length) {
      const columns = ['user_id', ...providedFields];
      const placeholders = columns.map(() => '?').join(', ');
      const values = [userId, ...providedFields.map((field) => changes[field])];
      const updates = providedFields.map((field) => `${field} = incoming.${field}`).join(', ');

      await connection.execute(
        `INSERT INTO user_profiles (${columns.join(', ')}) VALUES (${placeholders}) AS incoming
         ON DUPLICATE KEY UPDATE ${updates}`,
        values
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return getProfile(userId);
}

async function updateAvatar(userId, avatarData, avatarMime) {
  await pool.execute(
    `INSERT INTO user_profiles (user_id, avatar_data, avatar_mime)
     VALUES (?, ?, ?) AS incoming
     ON DUPLICATE KEY UPDATE
       avatar_data = incoming.avatar_data,
       avatar_mime = incoming.avatar_mime`,
    [userId, avatarData, avatarMime]
  );

  return getProfile(userId);
}

async function removeAvatar(userId) {
  await pool.execute(
    `UPDATE user_profiles
     SET avatar_data = NULL, avatar_mime = NULL
     WHERE user_id = ?`,
    [userId]
  );

  return getProfile(userId);
}

module.exports = { getProfile, updateProfile, updateAvatar, removeAvatar };

