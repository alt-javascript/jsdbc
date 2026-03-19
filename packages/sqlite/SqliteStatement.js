import { ResultSet, Statement } from '@alt-javascript/jsdbc-core';

/** Statement implementation for better-sqlite3 (synchronous under the hood, async facade). */
export default class SqliteStatement extends Statement {
  constructor(connection) {
    super(connection);
    this._db = connection._db;
  }

  async _executeQuery(sql) {
    const stmt = this._db.prepare(sql);
    const rows = stmt.all();
    const columns = rows.length > 0 ? Object.keys(rows[0]) : (stmt.columns ? stmt.columns().map((c) => c.name) : []);
    return new ResultSet(rows, columns);
  }

  async _executeUpdate(sql) {
    const trimmed = sql.trim().toUpperCase();
    // DDL statements — use exec, return 0
    if (trimmed.startsWith('CREATE') || trimmed.startsWith('DROP') || trimmed.startsWith('ALTER')) {
      this._db.exec(sql);
      return 0;
    }
    // DML statements — use prepare+run, return changes
    const stmt = this._db.prepare(sql);
    const result = stmt.run();
    return result.changes;
  }

  async _execute(sql) {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('WITH')) {
      return true;
    }
    const stmt = this._db.prepare(sql);
    stmt.run();
    return false;
  }
}
