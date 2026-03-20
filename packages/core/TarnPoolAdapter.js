/**
 * TarnPoolAdapter — Adapts tarn.js Pool to the JSDBC ConnectionPool interface.
 *
 * Usage:
 *   import { Pool } from 'tarn';
 *   import { TarnPoolAdapter } from '@alt-javascript/jsdbc-core';
 *
 *   const pool = TarnPoolAdapter.create(Pool, {
 *     create: () => ds.getConnection(),
 *     destroy: (conn) => conn.close(),
 *     validate: (conn) => !conn.isClosed(),
 *     min: 0,
 *     max: 10,
 *   });
 */
import ConnectionPool from './ConnectionPool.js';

export default class TarnPoolAdapter extends ConnectionPool {
  /**
   * @param {Object} tarnPool — an instance of tarn.Pool
   */
  constructor(tarnPool) {
    super();
    this._pool = tarnPool;
  }

  /**
   * Create a TarnPoolAdapter from tarn.js Pool class and config.
   * @param {Function} TarnPoolClass — the tarn.Pool constructor
   * @param {Object} config — tarn.js pool config (create, destroy, validate, min, max, etc.)
   * @returns {TarnPoolAdapter}
   */
  static create(TarnPoolClass, config) {
    const pool = new TarnPoolClass({
      create: config.create,
      destroy: config.destroy,
      validate: config.validate || (() => true),
      min: config.min ?? 0,
      max: config.max ?? 10,
      acquireTimeoutMillis: config.acquireTimeoutMillis ?? 30000,
      createTimeoutMillis: config.createTimeoutMillis ?? 30000,
      destroyTimeoutMillis: config.destroyTimeoutMillis ?? 5000,
      idleTimeoutMillis: config.idleTimeoutMillis ?? 30000,
      reapIntervalMillis: config.reapIntervalMillis ?? 1000,
    });
    return new TarnPoolAdapter(pool);
  }

  async acquire() {
    const acquire = this._pool.acquire();
    return acquire.promise;
  }

  async release(connection) {
    this._pool.release(connection);
  }

  async destroy() {
    await this._pool.destroy();
  }

  get numUsed() {
    return this._pool.numUsed();
  }

  get numFree() {
    return this._pool.numFree();
  }

  get numPending() {
    return this._pool.numPendingAcquires();
  }
}
