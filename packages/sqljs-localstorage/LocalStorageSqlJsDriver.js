import initSqlJs from 'sql.js';
import { Driver, DriverManager } from '@alt-javascript/jsdbc-core';
import LocalStorageSqlJsConnection from './LocalStorageSqlJsConnection.js';
import LocalStorageStore from './LocalStorageStore.js';

const { _base64ToUint8 } = LocalStorageSqlJsConnection;

/**
 * LocalStorageSqlJsDriver — JSDBC driver for SQLite via sql.js with localStorage persistence.
 *
 * URL scheme:  jsdbc:sqljs:localstorage:<key>
 *
 *   key — the localStorage key under which the serialised database is stored.
 *
 * On first connect:
 *   - If the key exists in localStorage, the database is restored from the stored binary.
 *   - Otherwise a fresh in-memory database is created.
 *
 * On every write (executeUpdate / executePreparedUpdate / commit):
 *   - The database is serialised to Base64 and written to localStorage.
 *
 * Testing:
 *   Pass a LocalStorageStore (wrapping a LocalStorageShim) via properties.store to
 *   avoid coupling to globalThis.localStorage in Node.js test environments.
 */
export default class LocalStorageSqlJsDriver extends Driver {
  static URL_PREFIX = 'jsdbc:sqljs:localstorage:';

  /** Cached SQL.js module (loaded once per process / page). */
  static _SQL = null;

  /**
   * @param {string} url
   * @returns {boolean}
   */
  acceptsURL(url) {
    return typeof url === 'string' && url.startsWith(LocalStorageSqlJsDriver.URL_PREFIX);
  }

  /**
   * @param {string} url — e.g. 'jsdbc:sqljs:localstorage:myapp-db'
   * @param {Object} [properties]
   * @param {import('./LocalStorageStore.js').default} [properties.store] — injectable store (for testing)
   * @param {Function} [properties.locateFile] — sql.js locateFile (for browser Wasm loading)
   * @returns {Promise<LocalStorageSqlJsConnection>}
   */
  async connect(url, properties = {}) {
    // Initialise sql.js module once.
    if (!LocalStorageSqlJsDriver._SQL) {
      const initOptions = {};
      if (properties.locateFile) {
        initOptions.locateFile = properties.locateFile;
      }
      LocalStorageSqlJsDriver._SQL = await initSqlJs(initOptions);
    }

    const SQL = LocalStorageSqlJsDriver._SQL;

    // Parse the storage key from the URL.
    const storageKey = url.slice(LocalStorageSqlJsDriver.URL_PREFIX.length);
    if (!storageKey) {
      throw new Error(`Invalid jsdbc-sqljs-localstorage URL — missing storage key: "${url}"`);
    }

    // Resolve the storage backend.
    const store = properties.store instanceof LocalStorageStore
      ? properties.store
      : new LocalStorageStore(properties.store ?? undefined);

    // Restore from localStorage if a snapshot exists, otherwise create fresh.
    let db;
    const stored = store.getItem(storageKey);
    if (stored !== null) {
      const data = _base64ToUint8(stored);
      db = new SQL.Database(data);
    } else {
      db = new SQL.Database();
    }

    return new LocalStorageSqlJsConnection(db, storageKey, store);
  }

  /** Reset the cached SQL module (for testing). */
  static resetModule() {
    LocalStorageSqlJsDriver._SQL = null;
  }
}

// Auto-register on import.
const _driver = new LocalStorageSqlJsDriver();
DriverManager.registerDriver(_driver);

export { LocalStorageSqlJsConnection, _driver };
