import { assert } from 'chai';
import { DataSource } from '@alt-javascript/jsdbc-core';
import '../LocalStorageSqlJsDriver.js';
import LocalStorageStore from '../LocalStorageStore.js';
import LocalStorageShim from './LocalStorageShim.js';

/**
 * Build a DataSource backed by a LocalStorageShim with an optional byte quota.
 */
function makeDs(key, quotaBytes = Infinity) {
  const shim = new LocalStorageShim(quotaBytes);
  const store = new LocalStorageStore(shim);
  return {
    ds: new DataSource({ url: `jsdbc:sqljs:localstorage:${key}`, properties: { store } }),
    shim,
    store,
  };
}

describe('QuotaExceededError handling', () => {
  it('propagates quota error as a descriptive JSDBC error on executeUpdate', async () => {
    // A sql.js SQLite file is at least 4 KB even empty. Use a 100-byte quota
    // so the very first _flush() after DDL exceeds it.
    const { ds } = makeDs('quota-test', 100);
    const conn = await ds.getConnection();
    const stmt = await conn.createStatement();

    let threw = false;
    try {
      await stmt.executeUpdate('CREATE TABLE big (id INTEGER PRIMARY KEY, data TEXT)');
    } catch (e) {
      threw = true;
      assert.include(e.message, 'localStorage quota exceeded', 'message should mention quota exceeded');
      assert.include(e.message, 'quota-test', 'message should include the storage key');
    }
    assert.isTrue(threw, 'Expected a QuotaExceededError-derived Error to be thrown');

    await stmt.close();
    await conn.close();
  });

  it('error message includes approximate size in KB', async () => {
    const { ds } = makeDs('quota-size', 10);
    const conn = await ds.getConnection();
    const stmt = await conn.createStatement();

    let message = '';
    try {
      await stmt.executeUpdate('CREATE TABLE t (id INTEGER)');
    } catch (e) {
      message = e.message;
    }
    // Should mention KB
    assert.match(message, /KB/, 'error message should include size in KB');
    await stmt.close();
    await conn.close();
  });

  it('in-memory database remains usable after a quota error', async () => {
    // Allow the first write through (quota = 9999 bytes) then block subsequent ones.
    // We'll simulate this with a custom backend that tracks calls.
    let callCount = 0;
    const customBackend = {
      getItem: () => null,
      setItem: (_k, v) => {
        callCount++;
        if (callCount > 1) {
          const err = new Error('QuotaExceededError');
          err.name = 'QuotaExceededError';
          throw err;
        }
        // first write succeeds
      },
      removeItem: () => {},
    };
    const store = new LocalStorageStore(customBackend);
    const ds = new DataSource({
      url: 'jsdbc:sqljs:localstorage:fallback-test',
      properties: { store },
    });

    const conn = await ds.getConnection();
    const stmt = await conn.createStatement();

    // First DDL — succeeds (callCount = 1)
    await stmt.executeUpdate('CREATE TABLE items (id INTEGER PRIMARY KEY, val TEXT)');

    // Second write — will throw QuotaExceededError on flush
    let quotaThrown = false;
    try {
      await stmt.executeUpdate("INSERT INTO items VALUES (1, 'hello')");
    } catch (e) {
      assert.include(e.message, 'localStorage quota exceeded');
      quotaThrown = true;
    }
    assert.isTrue(quotaThrown, 'Second write should have thrown quota error');

    // In-memory db should still be usable — SELECT still works
    const rs = await stmt.executeQuery('SELECT * FROM items');
    assert.isArray(rs.getRows(), 'ResultSet.getRows() should return an array after quota error');
    rs.close();

    await stmt.close();
    await conn.close();
  });

  it('non-quota storage errors are re-thrown as-is', async () => {
    const customBackend = {
      getItem: () => null,
      setItem: () => { throw new Error('Unexpected I/O error'); },
      removeItem: () => {},
    };
    const store = new LocalStorageStore(customBackend);
    const ds = new DataSource({
      url: 'jsdbc:sqljs:localstorage:io-error-test',
      properties: { store },
    });

    const conn = await ds.getConnection();
    const stmt = await conn.createStatement();

    let err = null;
    try {
      await stmt.executeUpdate('CREATE TABLE t (id INTEGER)');
    } catch (e) {
      err = e;
    }
    assert.isNotNull(err);
    assert.equal(err.message, 'Unexpected I/O error', 'non-quota errors should propagate unchanged');

    await stmt.close();
    await conn.close();
  });
});
