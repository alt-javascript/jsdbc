import SqlJsStatement from '@alt-javascript/jsdbc-sqljs/SqlJsStatement.js';

/**
 * LocalStorageSqlJsStatement — SqlJsStatement with localStorage write-through.
 *
 * After every DML / DDL write, calls connection._flush() to persist
 * the updated database to localStorage.
 */
export default class LocalStorageSqlJsStatement extends SqlJsStatement {
  async _executeUpdate(sql) {
    const n = await super._executeUpdate(sql);
    // Only flush in auto-commit mode. When inside a transaction, the committed
    // state is flushed by _commit(). Flushing mid-transaction would persist
    // partial state and can also cause sql.js to implicitly end the transaction.
    if (!this._connection._inTransaction) {
      this._connection._flush();
    }
    return n;
  }

  async _execute(sql) {
    const isQuery = await super._execute(sql);
    if (!isQuery && !this._connection._inTransaction) {
      this._connection._flush();
    }
    return isQuery;
  }
}
