/**
 * SimpleConnectionPool — Built-in connection pool for JSDBC.
 *
 * A lightweight async pool with no external dependencies.
 * Supports min/max size, idle timeout, acquire timeout, and
 * connection validation.
 *
 * For production workloads, consider using the tarn.js or
 * generic-pool adapters instead.
 */
import ConnectionPool from './ConnectionPool.js';

export default class SimpleConnectionPool extends ConnectionPool {
  /**
   * @param {Function} factory.create — async () => Connection
   * @param {Function} factory.destroy — async (conn) => void
   * @param {Function} [factory.validate] — async (conn) => boolean
   * @param {Object} [options]
   * @param {number} [options.min=0] — minimum pool size
   * @param {number} [options.max=10] — maximum pool size
   * @param {number} [options.acquireTimeoutMillis=30000] — max wait for a connection
   * @param {number} [options.idleTimeoutMillis=30000] — destroy idle connections after this
   * @param {number} [options.reapIntervalMillis=1000] — how often to check for idle connections
   */
  constructor(factory, options = {}) {
    super();
    this._create = factory.create;
    this._destroy = factory.destroy;
    this._validate = factory.validate || (() => true);

    this._min = options.min ?? 0;
    this._max = options.max ?? 10;
    this._acquireTimeoutMillis = options.acquireTimeoutMillis ?? 30000;
    this._idleTimeoutMillis = options.idleTimeoutMillis ?? 30000;
    this._reapIntervalMillis = options.reapIntervalMillis ?? 1000;

    // Pool state
    this._free = []; // { conn, idleSince }
    this._used = new Set();
    this._pendingAcquires = []; // { resolve, reject, timer }
    this._totalCreated = 0;
    this._destroyed = false;

    // Start reaper if idle timeout is set
    if (this._idleTimeoutMillis > 0 && this._reapIntervalMillis > 0) {
      this._reapTimer = setInterval(() => this._reap(), this._reapIntervalMillis);
      this._reapTimer.unref();
    }
  }

  async acquire() {
    if (this._destroyed) {
      throw new Error('Pool has been destroyed');
    }

    // Try to get a valid idle connection
    while (this._free.length > 0) {
      const { conn } = this._free.shift();
      const valid = await this._validate(conn);
      if (valid) {
        this._used.add(conn);
        return conn;
      }
      // Invalid — destroy it and try next
      this._totalCreated--;
      await this._destroySafe(conn);
    }

    // Can we create a new connection?
    if (this._totalCreated < this._max) {
      this._totalCreated++;
      try {
        const conn = await this._create();
        this._used.add(conn);
        return conn;
      } catch (err) {
        this._totalCreated--;
        throw err;
      }
    }

    // Pool is full — wait for a release
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this._pendingAcquires.findIndex((p) => p.timer === timer);
        if (idx >= 0) this._pendingAcquires.splice(idx, 1);
        reject(new Error(`Connection pool acquire timeout after ${this._acquireTimeoutMillis}ms`));
      }, this._acquireTimeoutMillis);
      timer.unref();
      this._pendingAcquires.push({ resolve, reject, timer });
    });
  }

  async release(connection) {
    if (this._destroyed) {
      await this._destroySafe(connection);
      return;
    }

    this._used.delete(connection);

    // Serve a pending acquire first
    if (this._pendingAcquires.length > 0) {
      const valid = await this._validate(connection);
      if (valid) {
        const { resolve, timer } = this._pendingAcquires.shift();
        clearTimeout(timer);
        this._used.add(connection);
        resolve(connection);
        return;
      }
      // Invalid — destroy and try to create fresh for the waiter
      this._totalCreated--;
      await this._destroySafe(connection);
      try {
        this._totalCreated++;
        const fresh = await this._create();
        const { resolve, timer } = this._pendingAcquires.shift();
        clearTimeout(timer);
        this._used.add(fresh);
        resolve(fresh);
      } catch (err) {
        this._totalCreated--;
        const { reject, timer } = this._pendingAcquires.shift();
        clearTimeout(timer);
        reject(err);
      }
      return;
    }

    // Return to idle pool
    this._free.push({ conn: connection, idleSince: Date.now() });
  }

  async destroy() {
    this._destroyed = true;

    if (this._reapTimer) {
      clearInterval(this._reapTimer);
      this._reapTimer = null;
    }

    // Reject all pending acquires
    for (const { reject, timer } of this._pendingAcquires) {
      clearTimeout(timer);
      reject(new Error('Pool has been destroyed'));
    }
    this._pendingAcquires.length = 0;

    // Destroy all idle connections
    for (const { conn } of this._free) {
      await this._destroySafe(conn);
    }
    this._free.length = 0;

    // Destroy all in-use connections
    for (const conn of this._used) {
      await this._destroySafe(conn);
    }
    this._used.clear();
    this._totalCreated = 0;
  }

  get numUsed() {
    return this._used.size;
  }

  get numFree() {
    return this._free.length;
  }

  get numPending() {
    return this._pendingAcquires.length;
  }

  /** Evict idle connections that have exceeded the timeout. */
  _reap() {
    const now = Date.now();
    let i = 0;
    while (i < this._free.length) {
      const entry = this._free[i];
      if (now - entry.idleSince > this._idleTimeoutMillis && this._totalCreated > this._min) {
        this._free.splice(i, 1);
        this._totalCreated--;
        this._destroySafe(entry.conn);
      } else {
        i++;
      }
    }
  }

  async _destroySafe(conn) {
    try {
      await this._destroy(conn);
    } catch {
      // swallow destroy errors
    }
  }
}
