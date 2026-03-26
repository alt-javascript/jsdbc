/**
 * LocalStorageShim — Map-backed localStorage test double.
 *
 * Drop-in replacement for window.localStorage in Node.js test environments.
 * Supports an optional quotaBytes limit to simulate QuotaExceededError.
 */
export default class LocalStorageShim {
  /**
   * @param {number} [quotaBytes=Infinity] — max bytes for any single setItem value
   */
  constructor(quotaBytes = Infinity) {
    this._map = new Map();
    this._quota = quotaBytes;
  }

  /**
   * @param {string} key
   * @returns {string|null}
   */
  getItem(key) {
    return this._map.has(key) ? this._map.get(key) : null;
  }

  /**
   * @param {string} key
   * @param {string} value
   * @throws {Error} QuotaExceededError if value exceeds configured quota
   */
  setItem(key, value) {
    const size = new TextEncoder().encode(value).length;
    if (size > this._quota) {
      const err = new Error('QuotaExceededError: The quota has been exceeded.');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this._map.set(key, value);
  }

  /**
   * @param {string} key
   */
  removeItem(key) {
    this._map.delete(key);
  }

  /** Clear all entries (for test teardown). */
  clear() {
    this._map.clear();
  }

  /** @returns {number} number of stored entries */
  get length() {
    return this._map.size;
  }
}
