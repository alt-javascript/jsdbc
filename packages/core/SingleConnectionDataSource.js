/**
 * SingleConnectionDataSource — Returns the same connection repeatedly.
 *
 * For in-memory databases (sql.js, better-sqlite3 :memory:) where each
 * connect() call creates a new empty database. This wraps a single
 * connection and returns it from getConnection(), with close() being a no-op.
 */
import { DataSource } from '@alt-javascript/jsdbc-core';

export default class SingleConnectionDataSource extends DataSource {
  /**
   * @param {Object} config
   * @param {string} config.url
   * @param {Object} [config.properties]
   */
  constructor(config) {
    super(config);
    this._connection = null;
    this._initialized = false;
  }

  async getConnection() {
    if (!this._initialized) {
      this._connection = await super.getConnection();
      // Wrap close() to be a no-op — the connection stays alive
      const realClose = this._connection.close.bind(this._connection);
      this._realClose = realClose;
      this._connection.close = async () => {};
      this._connection.isClosed = () => false;
      this._initialized = true;
    }
    return this._connection;
  }

  /** Actually close the underlying connection. */
  async destroy() {
    if (this._realClose) {
      await this._realClose();
    }
  }
}
