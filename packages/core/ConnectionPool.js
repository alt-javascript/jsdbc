/**
 * ConnectionPool — Interface for connection pool implementations.
 *
 * Implementations must provide acquire(), release(), destroy().
 * JSDBC ships a built-in SimpleConnectionPool; adapters exist for
 * tarn.js and generic-pool.
 */
export default class ConnectionPool {
  /**
   * Acquire a connection from the pool.
   * @returns {Promise<Connection>}
   */
  async acquire() {
    throw new Error('ConnectionPool.acquire() must be implemented');
  }

  /**
   * Release a connection back to the pool.
   * @param {Connection} connection
   * @returns {Promise<void>}
   */
  async release(connection) {
    throw new Error('ConnectionPool.release() must be implemented');
  }

  /**
   * Destroy the pool — close all connections and release resources.
   * @returns {Promise<void>}
   */
  async destroy() {
    throw new Error('ConnectionPool.destroy() must be implemented');
  }

  /** @returns {number} Number of connections currently in use. */
  get numUsed() {
    return 0;
  }

  /** @returns {number} Number of idle connections in the pool. */
  get numFree() {
    return 0;
  }

  /** @returns {number} Number of pending acquire requests. */
  get numPending() {
    return 0;
  }
}
