const test = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../config/db');
const roadmapsService = require('../services/roadmaps.service');

test('listRoadmaps joins filter conditions with a space', async () => {
  const originalQuery = pool.query;
  let capturedSql = '';
  pool.query = async (sql) => {
    capturedSql = sql;
    return { rows: [] };
  };

  try {
    await roadmapsService.listRoadmaps(1, {
      status: 'active',
      career_goal_id: 2,
    });
  } finally {
    pool.query = originalQuery;
  }

  assert.match(
    capturedSql,
    /r\.status = \$2 AND r\.career_goal_id = \$3/,
    'filter conditions must be separated by " AND "'
  );
});
