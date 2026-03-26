/**
 * LocalStorageStore — injectable abstraction over the localStorage API.
 *
 * Wraps any backend implementing { getItem, setItem, removeItem }.
 * Defaults to globalThis.localStorage for browser use.
 * Pass a LocalStorageShim (or any compatible object) for testing in Node.js.
 *
 * setItem() may throw QuotaExceededError — callers are responsible for catching.
 */
export default class LocalStorageStore {
  /**
   * @param {Object} [backend] — storage backend, defaults to globalThis.localStorage
   */
  constructor(backend = globalThis.localStorage) {
    this._backend = backend;
  }

  /**
   * @param {string} key
   * @returns {string|null}
   */
  getItem(key) {
    return this._backend.getItem(key);
  }

  /**
   * @param {string} key
   * @param {string} value
   * @throws {DOMException|Error} QuotaExceededError if storage is full
   */
  setItem(key, value) {
    this._backend.setItem(key, value);
  }

  /**
   * @param {string} key
   */
  removeItem(key) {
    this._backend.removeItem(key);
  }
}
