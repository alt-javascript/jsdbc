/**
 * Statement — Executes SQL against a connection.
 *
 * Abstract base class. Driver implementations override the protected
 * _executeQuery and _executeUpdate methods.
 */
export default class Statement {
  /**
   * @param {Connection} connection
   */
  constructor(connection) {
    this._connection = connection;
    this._closed = false;
  }

  /**
   * Execute a query that returns a ResultSet.
   * @param {string} sql
   * @returns {Promise<ResultSet>}
   */
  async executeQuery(sql) {
    this._checkClosed();
    return this._executeQuery(sql);
  }

  /**
   * Execute an INSERT, UPDATE, DELETE, or DDL statement.
   * @param {string} sql
   * @returns {Promise<number>} affected row count
   */
  async executeUpdate(sql) {
    this._checkClosed();
    return this._executeUpdate(sql);
  }

  /**
   * Execute any SQL. Returns true if the result is a ResultSet.
   * @param {string} sql
   * @returns {Promise<boolean>}
   */
  async execute(sql) {
    this._checkClosed();
    return this._execute(sql);
  }

  /** Close and release resources. */
  async close() {
    this._closed = true;
  }

  /** @returns {boolean} */
  isClosed() {
    return this._closed;
  }

  _checkClosed() {
    if (this._closed) throw new Error('Statement is closed');
  }

  // Override in driver implementations
  async _executeQuery(sql) { throw new Error('Not implemented'); }
  async _executeUpdate(sql) { throw new Error('Not implemented'); }
  async _execute(sql) { throw new Error('Not implemented'); }
}
