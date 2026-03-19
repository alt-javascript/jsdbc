import { Connection } from '@alt-javascript/jsdbc-core';
import SqlJsStatement from './SqlJsStatement.js';
import SqlJsPreparedStatement from './SqlJsPreparedStatement.js';

/** Connection implementation for sql.js. */
export default class SqlJsConnection extends Connection {
  /**
   * @param {Object} db — sql.js Database instance
   */
  constructor(db) {
    super();
    this._db = db;
    this._inTransaction = false;
  }

  async _createStatement() {
    return new SqlJsStatement(this);
  }

  async _prepareStatement(sql) {
    return new SqlJsPreparedStatement(this, sql);
  }

  async _setAutoCommit(autoCommit) {
    if (!autoCommit && !this._inTransaction) {
      this._db.run('BEGIN');
      this._inTransaction = true;
    }
  }

  async _commit() {
    if (this._inTransaction) {
      this._db.run('COMMIT');
      this._inTransaction = false;
    }
  }

  async _rollback() {
    if (this._inTransaction) {
      this._db.run('ROLLBACK');
      this._inTransaction = false;
    }
  }

  async close() {
    if (this._inTransaction) {
      try { this._db.run('ROLLBACK'); } catch { /* ignore */ }
    }
    this._db.close();
    await super.close();
  }
}
