/**
 * Connection — A session to a database.
 *
 * Abstract base class. Drivers override the factory methods and
 * transaction control.
 */
export default class Connection {
  constructor() {
    this._closed = false;
    this._autoCommit = true;
  }

  /**
   * Create a Statement for executing ad-hoc SQL.
   * @returns {Promise<Statement>}
   */
  async createStatement() {
    this._checkClosed();
    return this._createStatement();
  }

  /**
   * Create a PreparedStatement for parameterized SQL.
   * @param {string} sql — SQL with ? placeholders
   * @returns {Promise<PreparedStatement>}
   */
  async prepareStatement(sql) {
    this._checkClosed();
    return this._prepareStatement(sql);
  }

  /**
   * Set auto-commit mode. When false, explicit commit/rollback is required.
   * @param {boolean} autoCommit
   */
  async setAutoCommit(autoCommit) {
    this._checkClosed();
    this._autoCommit = autoCommit;
    await this._setAutoCommit(autoCommit);
  }

  /** @returns {boolean} */
  getAutoCommit() {
    return this._autoCommit;
  }

  /** Commit the current transaction. */
  async commit() {
    this._checkClosed();
    await this._commit();
  }

  /** Rollback the current transaction. */
  async rollback() {
    this._checkClosed();
    await this._rollback();
  }

  /** Close the connection and release resources. */
  async close() {
    this._closed = true;
  }

  /** @returns {boolean} */
  isClosed() {
    return this._closed;
  }

  _checkClosed() {
    if (this._closed) throw new Error('Connection is closed');
  }

  // Override in driver implementations
  async _createStatement() { throw new Error('Not implemented'); }
  async _prepareStatement(sql) { throw new Error('Not implemented'); }
  async _setAutoCommit(autoCommit) {}
  async _commit() { throw new Error('Not implemented'); }
  async _rollback() { throw new Error('Not implemented'); }
}
