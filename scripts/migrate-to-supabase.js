const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const backendRequire = createRequire(
  path.join(__dirname, '..', 'backend', 'package.json')
);
const { Client } = backendRequire('pg');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const targetUrl =
  process.env.TARGET_DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL_UNPOOLED ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL;
const dryRun = process.argv.includes('--dry-run');

const skipEmptyCheck = new Set(['subscription_plans']);
const selfReferencingColumns = {
  users: ['suspended_by'],
};

function clientOptions(url) {
  return {
    connectionString: url,
    ssl:
      process.env.DB_SSL === 'false'
        ? false
        : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' },
  };
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function sortTables(tables, foreignKeys) {
  const dependencies = new Map(tables.map((table) => [table, new Set()]));

  for (const { table, referenced } of foreignKeys) {
    if (
      table !== referenced &&
      dependencies.has(table) &&
      dependencies.has(referenced)
    ) {
      dependencies.get(table).add(referenced);
    }
  }

  const result = [];
  const visiting = new Set();
  const visited = new Set();

  function visit(table) {
    if (visited.has(table) || visiting.has(table)) return;
    visiting.add(table);
    for (const dependency of dependencies.get(table) || []) visit(dependency);
    visiting.delete(table);
    visited.add(table);
    result.push(table);
  }

  tables.forEach(visit);
  return result;
}

async function listTables(client) {
  const { rows } = await client.query(
    `SELECT c.relname AS table_name
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relname <> 'schema_migrations'
     ORDER BY c.relname`
  );
  return rows.map((row) => row.table_name);
}

async function listForeignKeys(client) {
  const { rows } = await client.query(
    `SELECT conrelid::regclass::text AS table_name,
       confrelid::regclass::text AS referenced_name
     FROM pg_constraint
     WHERE contype = 'f'
       AND connamespace = 'public'::regnamespace`
  );

  return rows.map((row) => ({
    table: String(row.table_name).replace(/^public\./, '').replace(/"/g, ''),
    referenced: String(row.referenced_name)
      .replace(/^public\./, '')
      .replace(/"/g, ''),
  }));
}

async function listColumns(client, table) {
  const { rows } = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
       AND is_generated = 'NEVER'
     ORDER BY ordinal_position`,
    [table]
  );
  return rows.map((row) => row.column_name);
}

async function copyTable(source, target, table) {
  const columns = await listColumns(source, table);
  const { rows } = await source.query(
    `SELECT ${columns.map(quoteIdent).join(', ')} FROM ${quoteIdent(table)}`
  );

  if (!rows.length) {
    console.log(`${table}: 0 rows`);
    return 0;
  }

  const selfColumns = new Set(selfReferencingColumns[table] || []);
  const insertColumns = columns;
  const placeholders = insertColumns
    .map((_, index) => `$${index + 1}`)
    .join(', ');
  const sql = `INSERT INTO ${quoteIdent(table)} (${insertColumns
    .map(quoteIdent)
    .join(', ')}) VALUES (${placeholders})`;

  for (const row of rows) {
    const values = insertColumns.map((column) =>
      selfColumns.has(column) ? null : row[column]
    );
    await target.query(sql, values);
  }

  for (const column of selfColumns) {
    const { rows: references } = await source.query(
      `SELECT id, ${quoteIdent(column)} FROM ${quoteIdent(table)}
       WHERE ${quoteIdent(column)} IS NOT NULL`
    );
    for (const reference of references) {
      await target.query(
        `UPDATE ${quoteIdent(table)} SET ${quoteIdent(column)} = $1 WHERE id = $2`,
        [reference[column], reference.id]
      );
    }
  }

  console.log(`${table}: ${rows.length} rows`);
  return rows.length;
}

async function resetSequence(target, table) {
  const { rows } = await target.query(
    `SELECT pg_get_serial_sequence($1, 'id') AS sequence_name`,
    [`public.${quoteIdent(table)}`]
  );
  const sequenceName = rows[0]?.sequence_name;
  if (!sequenceName) return;

  await target.query(
    `SELECT setval($1, COALESCE((SELECT MAX(id) FROM ${quoteIdent(table)}), 0) + 1, false)`,
    [sequenceName]
  );
}

async function main() {
  if (!sourceUrl || !targetUrl) {
    throw new Error(
      'Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL, or DATABASE_URL and SUPABASE_DATABASE_URL.'
    );
  }
  if (sourceUrl === targetUrl) {
    throw new Error('Source and target database URLs must be different.');
  }

  const source = new Client(clientOptions(sourceUrl));
  await source.connect();

  try {
    const tables = await listTables(source);
    const foreignKeys = await listForeignKeys(source);
    const orderedTables = sortTables(tables, foreignKeys);

    console.log('Copy order:');
    orderedTables.forEach((table, index) => console.log(`${index + 1}. ${table}`));

    if (dryRun) return;

    const target = new Client(clientOptions(targetUrl));
    await target.connect();

    try {
      for (const table of orderedTables) {
        if (skipEmptyCheck.has(table)) continue;
        const { rows } = await target.query(
          `SELECT COUNT(*)::int AS count FROM ${quoteIdent(table)}`
        );
        if (rows[0].count > 0) {
          throw new Error(
            `Target table ${table} already has ${rows[0].count} rows. Use a fresh Supabase database.`
          );
        }
      }

      await target.query('BEGIN');
      try {
        for (const table of orderedTables) {
          if (skipEmptyCheck.has(table)) {
            const { rows } = await target.query(
              `SELECT COUNT(*)::int AS count FROM ${quoteIdent(table)}`
            );
            if (rows[0].count > 0) {
              console.log(`${table}: skipped because target already has reference rows`);
              continue;
            }
          }
          await copyTable(source, target, table);
        }

        for (const table of orderedTables) {
          await resetSequence(target, table);
        }

        const rls = fs.readFileSync(
          path.join(__dirname, '..', 'backend', 'sql', 'rls.sql'),
          'utf8'
        );
        await target.query(rls);
        await target.query('COMMIT');
        console.log('Supabase data migration completed.');
      } catch (err) {
        await target.query('ROLLBACK');
        throw err;
      }
    } finally {
      await target.end();
    }
  } finally {
    await source.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Supabase migration failed:', err.message);
    process.exitCode = 1;
  });
}

module.exports = { sortTables, quoteIdent };
