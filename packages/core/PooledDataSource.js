/**
 * PooledDataSource — DataSource with connection pooling.
 *
 * Wraps any JSDBC DataSource and adds connection pooling via a pluggable
 * ConnectionPool implementation. When getConnection() is called, the pool
 * provides a proxy connection whose close() returns it to the pool instead
 * of closing the underlying connection.
 *
 * Three pool options:
 *   1. Built-in SimpleConnectionPool (default, no external deps)
 *   2. TarnPoolAdapter (pass tarn.js Pool class)
 *   3. GenericPoolAdapter (pass generic-pool module)
 *   4. Any custom ConnectionPool implementation
 *
 * Usage:
 *   const ds = new PooledDataSource({
 *     url: 'jsdbc:pg://localhost:5432/mydb',
 *     username: 'user',
 *     password: 'pass',
 *     pool: { min: 0, max: 10 },
 *   });
 *   const conn = await ds.getConnection();
 *   // ... use conn ...
 *   await conn.close(); // returns to pool, doesn't close
 *   await ds.destroy();  // closes all connections
 */
import DataSource from './DataSource.js';
import SimpleConnectionPool from './SimpleConnectionPool.js';

export default class PooledDataSource extends DataSource {
  /**
   * @param {Object} config
   * @param {string} config.url
   * @param {string} [config.username]
   * @param {string} [config.password]
   * @param {Object} [config.pool] — pool options (min, max, timeouts)
   * @param {ConnectionPool} [config.connectionPool] — custom pool instance (overrides pool options)
   */
  constructor(config = {}) {
    super(config);
    this._poolConfig = config.pool || {};

    if (config.connectionPool) {
      // User-provided pool (tarn adapter, generic-pool adapter, custom)
      this._pool = config.connectionPool;
    } else {
      // Built-in pool
      this._pool = new SimpleConnectionPool(
        {
          create: () => super.getConnection(),
          destroy: (conn) => conn.close(),
          validate: (conn) => !conn.isClosed(),
        },
        this._poolConfig,
      );
    }
  }

  /**
   * Get a pooled connection. The returned connection's close() method
   * returns it to the pool instead of closing the underlying connection.
   * @returns {Promise<Connection>}
   */
  async getConnection() {
    const conn = await this._pool.acquire();
    return this._wrapConnection(conn);
  }

  /**
   * Destroy the pool — close all connections.
   * @returns {Promise<void>}
   */
  async destroy() {
    await this._pool.destroy();
  }

  /** @returns {ConnectionPool} The underlying pool. */
  getPool() {
    return this._pool;
  }

  /**
   * Wrap a connection so close() returns it to the pool.
   * @private
   */
  _wrapConnection(conn) {
    const pool = this._pool;
    const realClose = conn.close.bind(conn);
    const realIsClosed = conn.isClosed.bind(conn);

    // Create a proxy that intercepts close()
    const proxy = Object.create(conn);
    proxy._released = false;

    proxy.close = async () => {
      if (!proxy._released) {
        proxy._released = true;
        await pool.release(conn);
      }
    };

    proxy.isClosed = () => {
      return proxy._released || realIsClosed();
    };

    // Expose the real close for pool destroy
    proxy._realClose = realClose;

    return proxy;
  }
}
