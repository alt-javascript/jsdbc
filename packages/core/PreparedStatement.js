/**
 * PreparedStatement — Parameterized SQL execution.
 *
 * Extends Statement. Parameters are set by 1-based index before execution.
 * Driver implementations override _executePreparedQuery and _executePreparedUpdate.
 */
import Statement from './Statement.js';

export default class PreparedStatement extends Statement {
  /**
   * @param {Connection} connection
   * @param {string} sql — SQL with ? placeholders
   */
  constructor(connection, sql) {
    super(connection);
    this._sql = sql;
    this._parameters = new Map();
  }

  /**
   * Set a parameter value (auto-detect type).
   * @param {number} index — 1-based
   * @param {*} value
   */
  setParameter(index, value) {
    this._checkClosed();
    this._parameters.set(index, value);
  }

  /** Alias for setParameter. */
  setString(index, value) { this.setParameter(index, value); }

  /** Alias for setParameter. */
  setInt(index, value) { this.setParameter(index, value); }

  /** Alias for setParameter. */
  setFloat(index, value) { this.setParameter(index, value); }

  /** Alias for setParameter. */
  setNull(index) { this.setParameter(index, null); }

  /**
   * Get parameters as an ordered array.
   * @returns {Array}
   */
  _getParameterArray() {
    const arr = [];
    for (let i = 1; i <= this._parameters.size; i++) {
      arr.push(this._parameters.get(i));
    }
    return arr;
  }

  /** Clear all parameter values. */
  clearParameters() {
    this._parameters.clear();
  }

  /**
   * Execute a prepared query returning a ResultSet.
   * @returns {Promise<ResultSet>}
   */
  async executeQuery() {
    this._checkClosed();
    return this._executePreparedQuery(this._sql, this._getParameterArray());
  }

  /**
   * Execute a prepared update/insert/delete.
   * @returns {Promise<number>} affected row count
   */
  async executeUpdate() {
    this._checkClosed();
    return this._executePreparedUpdate(this._sql, this._getParameterArray());
  }

  // Override in driver implementations
  async _executePreparedQuery(sql, params) { throw new Error('Not implemented'); }
  async _executePreparedUpdate(sql, params) { throw new Error('Not implemented'); }
}
