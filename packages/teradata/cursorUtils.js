/**
 * Shared helper — converts a teradatasql result (cursor after execute) into
 * a JSDBC ResultSet.
 *
 * teradatasql returns rows as arrays (positional), not as objects.
 * cursor.description is an array of 7-item sequences where [0] is the column name.
 * We zip the rows against the column names to produce plain objects, normalising
 * column names to lowercase for consistency with other JSDBC drivers.
 *
 * @param {object} cursor — teradatasql cursor, already executed
 * @returns {{ rows: Object[], columns: string[] }}
 */
export function cursorToRowsAndColumns(cursor) {
  const description = cursor.description || [];
  const columns = description.map((col) => col[0].toLowerCase());

  const rawRows = cursor.fetchall() || [];
  const rows = rawRows.map((row) => {
    const obj = {};
    for (let i = 0; i < columns.length; i++) {
      obj[columns[i]] = row[i];
    }
    return obj;
  });

  return { rows, columns };
}
