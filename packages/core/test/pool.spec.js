import { assert } from 'chai';
import {
  SimpleConnectionPool,
  PooledDataSource,
  ConnectionPool,
} from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqlite';

describe('Connection Pooling', () => {
  describe('SimpleConnectionPool', () => {
    let pool;
    let createCount;
    let destroyCount;

    beforeEach(() => {
      createCount = 0;
      destroyCount = 0;
      pool = new SimpleConnectionPool(
        {
          create: async () => {
            createCount++;
            return { id: createCount, closed: false };
          },
          destroy: async (conn) => {
            destroyCount++;
            conn.closed = true;
          },
          validate: (conn) => !conn.closed,
        },
        { min: 0, max: 3, idleTimeoutMillis: 0 },
      );
    });

    afterEach(async () => {
      if (pool) await pool.destroy();
    });

    it('creates connections on demand', async () => {
      const conn = await pool.acquire();
      assert.equal(createCount, 1);
      assert.equal(pool.numUsed, 1);
      assert.equal(pool.numFree, 0);
      await pool.release(conn);
    });

    it('reuses released connections', async () => {
      const conn1 = await pool.acquire();
      await pool.release(conn1);
      const conn2 = await pool.acquire();
      assert.equal(conn1.id, conn2.id);
      assert.equal(createCount, 1);
      await pool.release(conn2);
    });

    it('respects max pool size', async () => {
      const conns = [];
      for (let i = 0; i < 3; i++) {
        conns.push(await pool.acquire());
      }
      assert.equal(pool.numUsed, 3);
      assert.equal(createCount, 3);

      // 4th acquire should pend
      let resolved = false;
      const p = pool.acquire().then((c) => {
        resolved = true;
        return c;
      });

      assert.equal(pool.numPending, 1);
      assert.isFalse(resolved);

      // Release one — the pending acquire should resolve
      await pool.release(conns[0]);
      const conn4 = await p;
      assert.isTrue(resolved);
      assert.equal(conn4.id, conns[0].id);

      await pool.release(conns[1]);
      await pool.release(conns[2]);
      await pool.release(conn4);
    });

    it('acquire timeout rejects', async () => {
      const fastPool = new SimpleConnectionPool(
        {
          create: async () => ({ closed: false }),
          destroy: async () => {},
        },
        { max: 1, acquireTimeoutMillis: 50 },
      );
      await fastPool.acquire();
      try {
        await fastPool.acquire();
        assert.fail('should have thrown');
      } catch (err) {
        assert.include(err.message, 'acquire timeout');
      }
      await fastPool.destroy();
    });

    it('destroys all connections on destroy()', async () => {
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();
      await pool.release(conn1);
      // conn1 is idle, conn2 is in use
      await pool.destroy();
      assert.equal(destroyCount, 2);
    });

    it('rejects acquire after destroy', async () => {
      await pool.destroy();
      try {
        await pool.acquire();
        assert.fail('should have thrown');
      } catch (err) {
        assert.include(err.message, 'destroyed');
      }
    });

    it('discards invalid connections', async () => {
      const conn = await pool.acquire();
      conn.closed = true; // mark invalid
      await pool.release(conn);
      // Next acquire should create a fresh connection
      const conn2 = await pool.acquire();
      assert.notEqual(conn2.id, conn.id);
      assert.equal(createCount, 2);
      await pool.release(conn2);
    });
  });

  describe('PooledDataSource — with SQLite', () => {
    let ds;

    beforeEach(() => {
      ds = new PooledDataSource({
        url: 'jsdbc:sqlite::memory:',
        pool: { min: 0, max: 5 },
      });
    });

    afterEach(async () => {
      await ds.destroy();
    });

    it('returns a pooled connection', async () => {
      const conn = await ds.getConnection();
      assert.isFalse(conn.isClosed());
      await conn.close(); // returns to pool
      assert.isTrue(conn.isClosed()); // proxy reports closed
    });

    it('reuses connections from the pool', async () => {
      const pool = ds.getPool();
      const conn1 = await ds.getConnection();
      assert.equal(pool.numUsed, 1);
      await conn1.close();
      assert.equal(pool.numUsed, 0);
      assert.equal(pool.numFree, 1);

      const conn2 = await ds.getConnection();
      assert.equal(pool.numUsed, 1);
      assert.equal(pool.numFree, 0);
      await conn2.close();
    });

    it('supports SQL operations through pooled connections', async () => {
      const conn = await ds.getConnection();
      const stmt = await conn.createStatement();
      await stmt.executeUpdate('CREATE TABLE pool_test (id INTEGER PRIMARY KEY, name TEXT)');
      await stmt.executeUpdate("INSERT INTO pool_test VALUES (1, 'pooled')");
      const rs = await stmt.executeQuery('SELECT * FROM pool_test');
      assert.isTrue(rs.next());
      assert.equal(rs.getString('name'), 'pooled');
      rs.close();
      await stmt.close();
      await conn.close();
    });

    it('pool stats are accessible', async () => {
      const pool = ds.getPool();
      assert.equal(pool.numUsed, 0);
      assert.equal(pool.numFree, 0);
      assert.equal(pool.numPending, 0);

      const conn = await ds.getConnection();
      assert.equal(pool.numUsed, 1);
      await conn.close();
      assert.equal(pool.numUsed, 0);
      assert.equal(pool.numFree, 1);
    });

    it('destroy closes all connections', async () => {
      const conn = await ds.getConnection();
      await conn.close();
      await ds.destroy();
      const pool = ds.getPool();
      assert.equal(pool.numFree, 0);
      assert.equal(pool.numUsed, 0);
    });
  });

  describe('PooledDataSource — with custom pool', () => {
    it('accepts a custom ConnectionPool', async () => {
      let acquireCount = 0;
      let releaseCount = 0;

      const customPool = new ConnectionPool();
      const fakeConn = { isClosed: () => false, close: async () => {} };
      customPool.acquire = async () => {
        acquireCount++;
        return fakeConn;
      };
      customPool.release = async () => {
        releaseCount++;
      };
      customPool.destroy = async () => {};

      const ds = new PooledDataSource({
        url: 'jsdbc:sqlite::memory:',
        connectionPool: customPool,
      });

      const conn = await ds.getConnection();
      assert.equal(acquireCount, 1);
      await conn.close();
      assert.equal(releaseCount, 1);
      await ds.destroy();
    });
  });
});
