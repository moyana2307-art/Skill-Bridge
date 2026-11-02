const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toNumber,
  ratio,
  monthlyAmountCents,
  netCents,
} = require('../utils/metrics');

test('toNumber parses numeric database strings and falls back on invalid input', () => {
  assert.equal(toNumber('42'), 42);
  assert.equal(toNumber('12.9'), 12.9);
  assert.equal(toNumber(null, 7), 7);
  assert.equal(toNumber('not-a-number', 7), 7);
});

test('ratio handles zero denominators and precision', () => {
  assert.equal(ratio(1, 0), 0);
  assert.equal(ratio(1, 4), 0.25);
  assert.equal(ratio(2, 3, 4), 0.6667);
});

test('monthlyAmountCents normalizes yearly and non-recurring prices', () => {
  assert.equal(monthlyAmountCents(12000, 'year'), 1000);
  assert.equal(monthlyAmountCents(2500, 'month'), 2500);
  assert.equal(monthlyAmountCents(2500, null), 2500);
  assert.equal(monthlyAmountCents(2500, 'none'), 0);
});

test('netCents never returns a negative net amount', () => {
  assert.equal(netCents(1000, 250), 750);
  assert.equal(netCents(1000, 1500), 0);
  assert.equal(netCents('500', '100'), 400);
});
