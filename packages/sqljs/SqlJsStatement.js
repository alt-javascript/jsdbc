import { ResultSet, Statement } from '@alt-javascript/jsdbc-core';

/** Statement implementation for sql.js (synchronous SQL API, async facade). */
export default class SqlJsStatement extends Statement {
  constructor(connection) {
    super(connection);
    this._db = connection._db;
  }

  async _executeQuery(sql) {
    const results = this._db.exec(sql);
    if (results.length === 0) {
      return new ResultSet([], []);
    }
    const { columns, values } = results[0];
    const rows = values.map((vals) => {
      const row = {};
      columns.forEach((col, i) => { row[col] = vals[i]; });
      return row;
    });
    return new ResultSet(rows, columns);
  }

  async _executeUpdate(sql) {
    this._db.run(sql);
    return this._db.getRowsModified();
  }

  async _execute(sql) {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('WITH')) {
      return true;
    }
    this._db.run(sql);
    return false;
  }
}
