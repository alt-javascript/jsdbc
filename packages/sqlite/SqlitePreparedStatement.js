import { PreparedStatement, ResultSet } from '@alt-javascript/jsdbc-core';

/** PreparedStatement implementation for better-sqlite3. */
export default class SqlitePreparedStatement extends PreparedStatement {
  constructor(connection, sql) {
    super(connection, sql);
    this._db = connection._db;
  }

  async _executePreparedQuery(sql, params) {
    const stmt = this._db.prepare(sql);
    const rows = stmt.all(...params);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : stmt.columns().map((c) => c.name);
    return new ResultSet(rows, columns);
  }

  async _executePreparedUpdate(sql, params) {
    const stmt = this._db.prepare(sql);
    const result = stmt.run(...params);
    return result.changes;
  }
}
