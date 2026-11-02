const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const { pool } = require('../backend/config/db');

async function promoteUser(databasePool, email) {
  const { rows } = await databasePool.query(
    `SELECT id, name, email, role FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email]
  );

  if (!rows.length) {
    return { found: false, alreadyAdmin: false, user: null };
  }

  const user = rows[0];
  if (user.role === 'admin') {
    return { found: true, alreadyAdmin: true, user };
  }

  const { rows: updatedRows } = await databasePool.query(
    `UPDATE users SET role = 'admin', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING id, name, email, role`,
    [user.id]
  );

  return { found: true, alreadyAdmin: false, user: updatedRows[0] };
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node scripts/make-admin.js <email>');
    process.exitCode = 1;
    return;
  }

  const result = await promoteUser(pool, email);

  if (!result.found) {
    console.error(`No account found for ${email}. Register first, then retry.`);
    process.exitCode = 1;
    return;
  }

  if (result.alreadyAdmin) {
    console.log(`${result.user.email} is already an admin.`);
    return;
  }

  console.log(`${result.user.email} (${result.user.name}) is now an admin.`);
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('Could not promote that account:', err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { promoteUser };
