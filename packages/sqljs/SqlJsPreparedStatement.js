import { PreparedStatement, ResultSet } from '@alt-javascript/jsdbc-core';

/** PreparedStatement implementation for sql.js. */
export default class SqlJsPreparedStatement extends PreparedStatement {
  constructor(connection, sql) {
    super(connection, sql);
    this._db = connection._db;
  }

  async _executePreparedQuery(sql, params) {
    const stmt = this._db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    const columns = stmt.getColumnNames();
    while (stmt.step()) {
      const vals = stmt.get();
      const row = {};
      columns.forEach((col, i) => { row[col] = vals[i]; });
      rows.push(row);
    }
    stmt.free();
    return new ResultSet(rows, columns);
  }

  async _executePreparedUpdate(sql, params) {
    this._db.run(sql, params);
    return this._db.getRowsModified();
  }
}
