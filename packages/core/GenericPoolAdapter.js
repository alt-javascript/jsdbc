/**
 * GenericPoolAdapter — Adapts generic-pool to the JSDBC ConnectionPool interface.
 *
 * Usage:
 *   import genericPool from 'generic-pool';
 *   import { GenericPoolAdapter } from '@alt-javascript/jsdbc-core';
 *
 *   const pool = GenericPoolAdapter.create(genericPool, {
 *     create: () => ds.getConnection(),
 *     destroy: (conn) => conn.close(),
 *     validate: (conn) => !conn.isClosed(),
 *     min: 0,
 *     max: 10,
 *   });
 */
import ConnectionPool from './ConnectionPool.js';

export default class GenericPoolAdapter extends ConnectionPool {
  /**
   * @param {Object} pool — an instance of generic-pool Pool
   */
  constructor(pool) {
    super();
    this._pool = pool;
  }

  /**
   * Create a GenericPoolAdapter from the generic-pool module and config.
   * @param {Object} genericPoolModule — the generic-pool module (default import)
   * @param {Object} config — pool config (create, destroy, validate, min, max, etc.)
   * @returns {GenericPoolAdapter}
   */
  static create(genericPoolModule, config) {
    const factory = {
      create: config.create,
      destroy: config.destroy,
    };
    if (config.validate) {
      factory.validate = config.validate;
    }
    const pool = genericPoolModule.createPool(factory, {
      min: config.min ?? 0,
      max: config.max ?? 10,
      acquireTimeoutMillis: config.acquireTimeoutMillis ?? 30000,
      idleTimeoutMillis: config.idleTimeoutMillis ?? 30000,
      evictionRunIntervalMillis: config.reapIntervalMillis ?? 1000,
      testOnBorrow: !!config.validate,
    });
    return new GenericPoolAdapter(pool);
  }

  async acquire() {
    return this._pool.acquire();
  }

  async release(connection) {
    await this._pool.release(connection);
  }

  async destroy() {
    await this._pool.drain();
    await this._pool.clear();
  }

  get numUsed() {
    return this._pool.borrowed;
  }

  get numFree() {
    return this._pool.available;
  }

  get numPending() {
    return this._pool.pending;
  }
}
