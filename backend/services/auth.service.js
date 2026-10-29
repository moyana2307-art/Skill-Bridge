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
    avatar: avatarData && avatarMime
      ? `data:${avatarMime};base64,${Buffer.from(avatarData).toString('base64')}` : null,
  };
}

async function findUserById(id) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_USER_COLUMNS} FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`, [id]
  );
  return toPublicUser(rows[0]);
}

async function findUserByEmailWithPassword(email) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_USER_COLUMNS}, u.password_hash FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function createUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name, email, passwordHash]
    );
    const userId = rows[0].id;
    await client.query('INSERT INTO user_profiles (user_id) VALUES ($1)', [userId]);
    await client.query('COMMIT');
    return findUserById(userId);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') throw ApiError.conflict('An account with that email already exists');
    throw err;
  } finally {
    client.release();
  }
}

async function authenticate(email, password) {
  const row = await findUserByEmailWithPassword(email);
  if (!row) return null;
  const passwordMatches = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatches) return null;
  return toPublicUser(row);
}

module.exports = { findUserById, createUser, authenticate };
