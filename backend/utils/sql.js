// Small helpers for building safe SQL fragments.

// Escapes the wildcard characters inside a search term so that a user typing
// "%" searches for a literal percent sign instead of matching everything.
function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Builds "WHERE a = ? AND b = ?" plus the matching values array.
// Every value stays a placeholder, so user input is never pasted into SQL.
function buildWhere(conditions) {
  const clauses = [];
  const values = [];

  for (const { column, operator = '=', value } of conditions) {
    if (value === undefined || value === null || value === '') continue;
    clauses.push(`${column} ${operator} ?`);
    values.push(value);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
}

module.exports = { escapeLike, buildWhere };
