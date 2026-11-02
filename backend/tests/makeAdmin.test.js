const test = require('node:test');
const assert = require('node:assert/strict');
const { promoteUser } = require('../../scripts/make-admin');

function fakePool(responses) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response;
    },
  };
}

test('promoteUser reports when the account does not exist', async () => {
  const pool = fakePool([{ rows: [] }]);
  const result = await promoteUser(pool, 'missing@example.com');

  assert.equal(result.found, false);
  assert.equal(result.alreadyAdmin, false);
  assert.match(pool.calls[0].sql, /LOWER\(email\) = LOWER\(\$1\)/);
  assert.deepEqual(pool.calls[0].params, ['missing@example.com']);
});

test('promoteUser leaves an existing admin unchanged', async () => {
  const pool = fakePool([
    { rows: [{ id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin' }] },
  ]);
  const result = await promoteUser(pool, 'admin@example.com');

  assert.equal(result.found, true);
  assert.equal(result.alreadyAdmin, true);
  assert.equal(pool.calls.length, 1);
});

test('promoteUser updates a normal user to admin with PostgreSQL placeholders', async () => {
  const pool = fakePool([
    { rows: [{ id: 7, name: 'User', email: 'user@example.com', role: 'user' }] },
    { rows: [{ id: 7, name: 'User', email: 'user@example.com', role: 'admin' }] },
  ]);
  const result = await promoteUser(pool, 'user@example.com');

  assert.equal(result.found, true);
  assert.equal(result.alreadyAdmin, false);
  assert.equal(result.user.role, 'admin');
  assert.match(pool.calls[1].sql, /SET role = 'admin'/);
  assert.match(pool.calls[1].sql, /WHERE id = \$1/);
  assert.deepEqual(pool.calls[1].params, [7]);
});
