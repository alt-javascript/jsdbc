import SqlJsPreparedStatement from '@alt-javascript/jsdbc-sqljs/SqlJsPreparedStatement.js';

/**
 * LocalStorageSqlJsPreparedStatement — SqlJsPreparedStatement with localStorage write-through.
 *
 * After every prepared DML write, calls connection._flush() to persist
 * the updated database to localStorage.
 */
export default class LocalStorageSqlJsPreparedStatement extends SqlJsPreparedStatement {
  async _executePreparedUpdate(sql, params) {
    const n = await super._executePreparedUpdate(sql, params);
    // Only flush in auto-commit mode — _commit() handles the flush for transactions.
    if (!this._connection._inTransaction) {
      this._connection._flush();
    }
    return n;
  }
}
