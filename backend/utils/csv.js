// Safe CSV generation for admin exports.
//
// Spreadsheet programs execute cells that start with =, +, -, or @ as formulas.
// Prefixing those cells with an apostrophe prevents CSV formula injection while
// keeping the visible value unchanged. Columns are always explicitly ordered.

function csvCell(value) {
  let text =
    value === null || value === undefined
      ? ''
      : value instanceof Date
      ? value.toISOString()
      : String(value);

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows, columns) {
  const header = columns.map((column) => csvCell(column.label)).join(',');
  const body = rows.map((row) =>
    columns.map((column) => csvCell(column.value(row))).join(',')
  );
  return [header, ...body].join('\r\n');
}

function sendCsv(res, filename, csv) {
  const safeName = String(filename).replace(/[^\w.-]+/g, '-');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(csv);
}

module.exports = { toCsv, sendCsv, csvCell };
