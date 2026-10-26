// Promotes an existing account to admin so it can trigger
// POST /api/opportunities/sync.
//
// Usage (from the project root):
//   node scripts/make-admin.js you@example.com
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', 'backend', '.env'),
});

const { pool } = require('../backend/config/db');

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: node scripts/make-admin.js <email>');
    process.exitCode = 1;
    return;
  }

  const [rows] = await pool.execute(
    'SELECT id, name, email, role FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  if (!rows.length) {
    console.error(`No account found for ${email}. Register first, then retry.`);
    process.exitCode = 1;
    return;
  }

  const user = rows[0];

  if (user.role === 'admin') {
    console.log(`${user.email} is already an admin.`);
    return;
  }

  await pool.execute('UPDATE users SET role = ? WHERE id = ?', [
    'admin',
    user.id,
  ]);

  console.log(`${user.email} (${user.name}) is now an admin.`);
}

main()
  .catch((err) => {
    console.error('Could not promote that account:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
