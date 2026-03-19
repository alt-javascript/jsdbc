import Database from 'better-sqlite3';
import { Driver, DriverManager } from '@alt-javascript/jsdbc-core';
import SqliteConnection from './SqliteConnection.js';

/** JSDBC driver for SQLite via better-sqlite3. */
export default class SqliteDriver extends Driver {
  static URL_PREFIX = 'jsdbc:sqlite:';

  /**
   * @param {string} url — e.g. 'jsdbc:sqlite:./mydb.sqlite' or 'jsdbc:sqlite::memory:'
   * @returns {boolean}
   */
  acceptsURL(url) {
    return typeof url === 'string' && url.startsWith(SqliteDriver.URL_PREFIX);
  }

  /**
   * @param {string} url
   * @param {Object} [properties]
   * @returns {Promise<SqliteConnection>}
   */
  async connect(url, properties = {}) {
    const path = url.substring(SqliteDriver.URL_PREFIX.length);
    const dbPath = path === ':memory:' || path === 'memory' ? ':memory:' : path;
    const options = {};
    if (properties.readonly) options.readonly = true;
    const db = new Database(dbPath, options);
    db.pragma('journal_mode = WAL');
    return new SqliteConnection(db);
  }
}

// Auto-register on import
const _driver = new SqliteDriver();
DriverManager.registerDriver(_driver);

export { SqliteConnection, _driver };
