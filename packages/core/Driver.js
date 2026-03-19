/**
 * Driver — Creates connections to a specific database type.
 *
 * Each driver implementation registers itself with DriverManager
 * and declares which URL schemes it handles.
 */
export default class Driver {
  /**
   * Check if this driver handles the given JSDBC URL.
   * @param {string} url — e.g. 'jsdbc:sqlite:./mydb.sqlite'
   * @returns {boolean}
   */
  acceptsURL(url) {
    return false;
  }

  /**
   * Create a connection to the database.
   * @param {string} url — JSDBC URL
   * @param {Object} [properties] — { username, password, ...driverSpecific }
   * @returns {Promise<Connection>}
   */
  async connect(url, properties = {}) {
    throw new Error('Not implemented');
  }
}
