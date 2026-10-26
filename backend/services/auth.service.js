// Account creation and login checks. Passwords are hashed here, and the
// password hash is never returned to a controller or the browser.
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');

const BCRYPT_ROUNDS = 12;
const PUBLIC_USER_COLUMNS = `u.id, u.name, u.email, u.role, u.created_at,
  u.updated_at, p.avatar_data, p.avatar_mime`;

function toPublicUser(row) {
  if (!row) return null;

  const { password_hash: _passwordHash, avatar_data: avatarData, avatar_mime: avatarMime, ...user } = row;

  return {
    ...user,
    avatar:
      avatarData && avatarMime
        ? `data:${avatarMime};base64,${Buffer.from(avatarData).toString('base64')}`
        : null,
  };
}

async function findUserById(id) {
  const [rows] = await pool.execute(
    `SELECT ${PUBLIC_USER_COLUMNS}
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = ?`,
    [id]
  );

  return toPublicUser(rows[0]);
}

async function findUserByEmailWithPassword(email) {
  const [rows] = await pool.execute(
    `SELECT ${PUBLIC_USER_COLUMNS}, u.password_hash
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.email = ?`,
    [email]
  );

  return rows[0] || null;
}

// Creates the account and an empty profile in one transaction, so a user is
// never left without a profile row.
async function createUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );

    await connection.execute('INSERT INTO user_profiles (user_id) VALUES (?)', [
      result.insertId,
    ]);

    await connection.commit();

    return findUserById(result.insertId);
  } catch (err) {
    await connection.rollback();

    if (err.code === 'ER_DUP_ENTRY') {
      throw ApiError.conflict('An account with that email already exists');
    }

    throw err;
  } finally {
    connection.release();
  }
}

// Returns the public user fields only when the password is correct.
// A missing account and a wrong password produce the same result, so an
// attacker cannot tell which emails are registered.
async function authenticate(email, password) {
  const row = await findUserByEmailWithPassword(email);
  if (!row) return null;

  const passwordMatches = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatches) return null;

  return toPublicUser(row);
}

module.exports = {
  findUserById,
  createUser,
  authenticate,
};
