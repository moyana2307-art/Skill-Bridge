const test = require('node:test');
const assert = require('node:assert/strict');
const { sortTables, quoteIdent } = require('../../scripts/migrate-to-supabase');

test('sortTables places referenced tables before dependent tables', () => {
  const ordered = sortTables(
    ['payment_records', 'users', 'subscriptions', 'plans'],
    [
      { table: 'subscriptions', referenced: 'users' },
      { table: 'payment_records', referenced: 'users' },
      { table: 'payment_records', referenced: 'subscriptions' },
    ]
  );

  assert.ok(ordered.indexOf('users') < ordered.indexOf('subscriptions'));
  assert.ok(ordered.indexOf('subscriptions') < ordered.indexOf('payment_records'));
  assert.equal(ordered.length, 4);
});

test('sortTables tolerates self references and cycles', () => {
  const ordered = sortTables(
    ['users', 'a', 'b'],
    [
      { table: 'users', referenced: 'users' },
      { table: 'a', referenced: 'b' },
      { table: 'b', referenced: 'a' },
    ]
  );

  assert.deepEqual(ordered.sort(), ['a', 'b', 'users']);
});

test('quoteIdent escapes double quotes', () => {
  assert.equal(quoteIdent('users'), '"users"');
  assert.equal(quoteIdent('weird"name'), '"weird""name"');
});
