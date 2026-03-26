import { assert } from 'chai';
import { DataSource } from '@alt-javascript/jsdbc-core';
import '../LocalStorageSqlJsDriver.js';
import LocalStorageStore from '../LocalStorageStore.js';
import LocalStorageShim from './LocalStorageShim.js';
import driverComplianceTests from '../../core/test/driverCompliance.js';

// ── Compliance suite ─────────────────────────────────────────────────────────
// Each call to getDataSource() returns a fresh DataSource backed by a new shim
// so every top-level suite gets a clean slate.

driverComplianceTests('sqljs-localstorage', async () => {
  const shim = new LocalStorageShim();
  const store = new LocalStorageStore(shim);
  return new DataSource({
    url: 'jsdbc:sqljs:localstorage:testdb',
    properties: { store },
  });
});

// ── Cross-session persistence ─────────────────────────────────────────────────

describe('Cross-session persistence', () => {
  it('data written in one connect() is visible after a fresh connect()', async () => {
    const shim = new LocalStorageShim();
    const store = new LocalStorageStore(shim);
    const props = { store };

    // Session A — write
    const dsA = new DataSource({ url: 'jsdbc:sqljs:localstorage:sess', properties: props });
    const connA = await dsA.getConnection();
    const stmtA = await connA.createStatement();
    await stmtA.executeUpdate('CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, txt TEXT)');
    await stmtA.executeUpdate("INSERT INTO notes VALUES (1, 'hello')");
    await stmtA.close();
    await connA.close();

    // Session B — same shim, same key; should restore from localStorage
    const dsB = new DataSource({ url: 'jsdbc:sqljs:localstorage:sess', properties: props });
    const connB = await dsB.getConnection();
    const stmtB = await connB.createStatement();
    const rs = await stmtB.executeQuery('SELECT txt FROM notes WHERE id = 1');
    assert.isTrue(rs.next(), 'Expected a row to be present after restore');
    assert.equal(rs.getString('txt'), 'hello');
    rs.close();
    await stmtB.close();
    await connB.close();
  });

  it('multiple writes all survive restoration', async () => {
    const shim = new LocalStorageShim();
    const store = new LocalStorageStore(shim);
    const props = { store };

    const dsA = new DataSource({ url: 'jsdbc:sqljs:localstorage:multi', properties: props });
    const connA = await dsA.getConnection();
    const stmtA = await connA.createStatement();
    await stmtA.executeUpdate('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, val TEXT)');
    await stmtA.executeUpdate("INSERT INTO items VALUES (1, 'alpha')");
    await stmtA.executeUpdate("INSERT INTO items VALUES (2, 'beta')");
    await stmtA.executeUpdate("INSERT INTO items VALUES (3, 'gamma')");
    await stmtA.close();
    await connA.close();

    const dsB = new DataSource({ url: 'jsdbc:sqljs:localstorage:multi', properties: props });
    const connB = await dsB.getConnection();
    const stmtB = await connB.createStatement();
    const rs = await stmtB.executeQuery('SELECT count(*) as c FROM items');
    assert.isTrue(rs.next());
    assert.equal(rs.getInt('c'), 3);
    rs.close();
    await stmtB.close();
    await connB.close();
  });
});

// ── Transaction rollback restores localStorage ────────────────────────────────

describe('Transaction rollback restores localStorage', () => {
  it('rolled-back INSERT is not visible after fresh connect()', async () => {
    const shim = new LocalStorageShim();
    const store = new LocalStorageStore(shim);
    const props = { store };

    // Session A — create table (committed, auto-commit), then rollback an insert
    const dsA = new DataSource({ url: 'jsdbc:sqljs:localstorage:txtest', properties: props });
    const connA = await dsA.getConnection();

    const stmtSetup = await connA.createStatement();
    await stmtSetup.executeUpdate('CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY)');
    await stmtSetup.close();

    await connA.setAutoCommit(false);
    const stmtA = await connA.createStatement();
    await stmtA.executeUpdate('INSERT INTO events VALUES (42)');
    await connA.rollback();
    await stmtA.close();
    await connA.close();

    // Session B — row must not exist
    const dsB = new DataSource({ url: 'jsdbc:sqljs:localstorage:txtest', properties: props });
    const connB = await dsB.getConnection();
    const stmtB = await connB.createStatement();
    const rs = await stmtB.executeQuery('SELECT * FROM events WHERE id = 42');
    assert.isFalse(rs.next(), 'Rolled-back row should not be visible after restore');
    rs.close();
    await stmtB.close();
    await connB.close();
  });

  it('committed data persists after rollback of a subsequent transaction', async () => {
    const shim = new LocalStorageShim();
    const store = new LocalStorageStore(shim);
    const props = { store };

    const ds = new DataSource({ url: 'jsdbc:sqljs:localstorage:tx2', properties: props });

    // Tx1 — commit row 1
    const conn1 = await ds.getConnection();
    const s1 = await conn1.createStatement();
    await s1.executeUpdate('CREATE TABLE IF NOT EXISTS vals (id INTEGER PRIMARY KEY)');
    await conn1.setAutoCommit(false);
    await s1.executeUpdate('INSERT INTO vals VALUES (1)');
    await conn1.commit();
    await s1.close();
    await conn1.close();

    // Tx2 — rollback row 2
    const conn2 = await ds.getConnection();
    await conn2.setAutoCommit(false);
    const s2 = await conn2.createStatement();
    await s2.executeUpdate('INSERT INTO vals VALUES (2)');
    await conn2.rollback();
    await s2.close();
    await conn2.close();

    // Fresh connection — row 1 must exist, row 2 must not
    const conn3 = await ds.getConnection();
    const s3 = await conn3.createStatement();
    const rs1 = await s3.executeQuery('SELECT * FROM vals WHERE id = 1');
    assert.isTrue(rs1.next(), 'Committed row 1 must survive');
    rs1.close();
    const rs2 = await s3.executeQuery('SELECT * FROM vals WHERE id = 2');
    assert.isFalse(rs2.next(), 'Rolled-back row 2 must not appear');
    rs2.close();
    await s3.close();
    await conn3.close();
  });
});
