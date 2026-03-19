import { Connection } from '@alt-javascript/jsdbc-core';
import SqliteStatement from './SqliteStatement.js';
import SqlitePreparedStatement from './SqlitePreparedStatement.js';

/** Connection implementation for better-sqlite3. */
export default class SqliteConnection extends Connection {
  /**
   * @param {import('better-sqlite3').Database} db — better-sqlite3 database instance
   */
  constructor(db) {
    super();
    this._db = db;
    this._inTransaction = false;
  }

  async _createStatement() {
    return new SqliteStatement(this);
  }

  async _prepareStatement(sql) {
    return new SqlitePreparedStatement(this, sql);
  }

  async _setAutoCommit(autoCommit) {
    if (!autoCommit && !this._inTransaction) {
      this._db.exec('BEGIN');
      this._inTransaction = true;
    }
  }

  async _commit() {
    if (this._inTransaction) {
      this._db.exec('COMMIT');
      this._inTransaction = false;
    }
  }

  async _rollback() {
    if (this._inTransaction) {
      this._db.exec('ROLLBACK');
      this._inTransaction = false;
    }
  }

  async close() {
    if (this._inTransaction) {
      try { this._db.exec('ROLLBACK'); } catch { /* ignore */ }
    }
    this._db.close();
    await super.close();
  }
}
