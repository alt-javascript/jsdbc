import SqlJsConnection from '@alt-javascript/jsdbc-sqljs/SqlJsConnection.js';
import LocalStorageSqlJsStatement from './LocalStorageSqlJsStatement.js';
import LocalStorageSqlJsPreparedStatement from './LocalStorageSqlJsPreparedStatement.js';

/**
 * Convert a Uint8Array to a Base64 string without hitting the argument-count
 * limit of Function.prototype.apply / spread for large arrays.
 * @param {Uint8Array} data
 * @returns {string}
 */
function uint8ToBase64(data) {
  const CHUNK = 0x8000; // 32 KB chunks
  let binary = '';
  for (let i = 0; i < data.length; i += CHUNK) {
    binary += String.fromCharCode(...data.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Convert a Base64 string back to a Uint8Array.
 * @param {string} b64
 * @returns {Uint8Array}
 */
function base64ToUint8(b64) {
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

/**
 * LocalStorageSqlJsConnection — SqlJsConnection with localStorage write-through.
 *
 * Every write (executeUpdate / executePreparedUpdate) triggers _flush(), which
 * serialises the sql.js database to Base64 and persists it via LocalStorageStore.
 *
 * On first connect, if a stored value exists it is restored — enabling cross-session
 * persistence.
 *
 * Transaction semantics:
 *   - Before BEGIN, the current localStorage value is snapshotted.
 *   - On commit(), the new state is flushed.
 *   - On rollback(), the snapshot is restored in localStorage so the on-disk
 *     (storage) state rolls back along with the in-memory sql.js state.
 */
export default class LocalStorageSqlJsConnection extends SqlJsConnection {
  /**
   * @param {import('sql.js').Database} db — sql.js Database instance
   * @param {string} storageKey — localStorage key for this database
   * @param {import('./LocalStorageStore.js').default} store — LocalStorageStore instance
   */
  constructor(db, storageKey, store) {
    super(db);
    this._storageKey = storageKey;
    this._store = store;
    this._snapshot = null; // pre-transaction localStorage value (string|null)
  }

  // ── Factory methods ────────────────────────────────────────────────────────

  async _createStatement() {
    return new LocalStorageSqlJsStatement(this);
  }

  async _prepareStatement(sql) {
    return new LocalStorageSqlJsPreparedStatement(this, sql);
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  /**
   * Serialise the sql.js database to Base64 and write it to localStorage.
   * Rethrows QuotaExceededError as a descriptive JSDBC error including the
   * key name and approximate size so developers can diagnose storage pressure.
   *
   * @throws {Error} if localStorage is full
   */
  _flush() {
    const data = this._db.export(); // Uint8Array — full SQLite binary
    const b64 = uint8ToBase64(data);
    const sizeKB = (b64.length / 1024).toFixed(1);
    try {
      this._store.setItem(this._storageKey, b64);
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        throw new Error(
          `localStorage quota exceeded for key "${this._storageKey}" (~${sizeKB} KB). ` +
          `Consider running VACUUM to compact the database.`,
        );
      }
      throw e;
    }
  }

  // ── Transaction control ───────────────────────────────────────────────────

  async _setAutoCommit(autoCommit) {
    if (!autoCommit && !this._inTransaction) {
      // Snapshot the current stored value before BEGIN so rollback can restore it.
      this._snapshot = this._store.getItem(this._storageKey);
      this._db.run('BEGIN');
      this._inTransaction = true;
    }
  }

  async _commit() {
    if (this._inTransaction) {
      this._db.run('COMMIT');
      this._inTransaction = false;
      this._snapshot = null;
      this._flush(); // persist the committed state
    }
  }

  async _rollback() {
    if (this._inTransaction) {
      this._db.run('ROLLBACK');
      this._inTransaction = false;
      // Restore the pre-transaction localStorage value so on-disk state also rolls back.
      if (this._snapshot !== null) {
        this._store.setItem(this._storageKey, this._snapshot);
      } else {
        this._store.removeItem(this._storageKey);
      }
      this._snapshot = null;
    }
  }

  async close() {
    if (this._inTransaction) {
      try { this._db.run('ROLLBACK'); } catch { /* ignore */ }
      // Restore snapshot on unclean close (caller forgot to rollback).
      if (this._snapshot !== null) {
        try { this._store.setItem(this._storageKey, this._snapshot); } catch { /* best-effort */ }
      }
    }
    this._db.close();
    this._closed = true; // bypass SqlJsConnection.close — db already closed above
  }

  // ── Helpers (exported for testing) ────────────────────────────────────────

  static _uint8ToBase64 = uint8ToBase64;
  static _base64ToUint8 = base64ToUint8;
}
