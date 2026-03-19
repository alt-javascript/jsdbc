/**
 * DataSource — Connection factory with optional pooling.
 *
 * Base implementation creates a new connection per getConnection() call.
 * Subclasses can add pooling (e.g. via tarn.js).
 */
import DriverManager from './DriverManager.js';

export default class DataSource {
  /**
   * @param {Object} config
   * @param {string} config.url — JSDBC URL
   * @param {string} [config.username]
   * @param {string} [config.password]
   * @param {Object} [config.properties] — additional driver properties
   */
  constructor(config = {}) {
    this._url = config.url;
    this._properties = {
      username: config.username,
      password: config.password,
      ...config.properties,
    };
  }

  /**
   * Get a connection from the configured data source.
   * @returns {Promise<Connection>}
   */
  async getConnection() {
    return DriverManager.getConnection(this._url, this._properties);
  }

  /** @returns {string} */
  getUrl() {
    return this._url;
  }
}
