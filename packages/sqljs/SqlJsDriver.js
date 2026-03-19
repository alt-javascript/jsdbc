import initSqlJs from 'sql.js';
import { Driver, DriverManager } from '@alt-javascript/jsdbc-core';
import SqlJsConnection from './SqlJsConnection.js';

/** JSDBC driver for SQLite via sql.js (isomorphic — works in Node.js and browser). */
export default class SqlJsDriver extends Driver {
  static URL_PREFIX = 'jsdbc:sqljs:';

  /** Cached SQL.js module (loaded once). */
  static _SQL = null;

  /**
   * @param {string} url — e.g. 'jsdbc:sqljs:memory' or 'jsdbc:sqljs::memory:'
   * @returns {boolean}
   */
  acceptsURL(url) {
    return typeof url === 'string' && url.startsWith(SqlJsDriver.URL_PREFIX);
  }

  /**
   * @param {string} url
   * @param {Object} [properties]
   * @param {Object} [properties.locateFile] — sql.js locateFile function (for browser wasm loading)
   * @returns {Promise<SqlJsConnection>}
   */
  async connect(url, properties = {}) {
    if (!SqlJsDriver._SQL) {
      const initOptions = {};
      if (properties.locateFile) {
        initOptions.locateFile = properties.locateFile;
      }
      SqlJsDriver._SQL = await initSqlJs(initOptions);
    }
    const db = new SqlJsDriver._SQL.Database();
    return new SqlJsConnection(db);
  }

  /** Reset the cached SQL module (for testing). */
  static resetModule() {
    SqlJsDriver._SQL = null;
  }
}

// Auto-register on import
const _driver = new SqlJsDriver();
DriverManager.registerDriver(_driver);

export { SqlJsConnection, _driver };
