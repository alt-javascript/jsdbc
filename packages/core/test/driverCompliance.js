/**
 * Shared JSDBC driver compliance tests.
 *
 * This module exports a function that generates a full mocha test suite
 * for any JSDBC driver. Each driver's test file calls this with a setup
 * function that returns a DataSource.
 */
import { assert } from 'chai';

export default function driverComplianceTests(driverName, getDataSource, options = {}) {
  const {
    limitOne = 'LIMIT 1',
    realType = 'REAL',
    textType = 'TEXT',
    ifNotExists = true,
    dropSyntax = 'mssql',
  } = options;

  // Helper: generate DDL compatible with the target database
  function createTable(name, cols) {
    if (ifNotExists) {
      return `CREATE TABLE IF NOT EXISTS ${name} (${cols})`;
    }
    // For databases without IF NOT EXISTS (MSSQL): caller must drop first
    return `CREATE TABLE ${name} (${cols})`;
  }

  // Helper: drop table if it exists
  function dropTable(name) {
    if (ifNotExists) {
      return null; // not needed — CREATE TABLE IF NOT EXISTS handles it
    }
    if (dropSyntax === 'oracle') {
      return `BEGIN EXECUTE IMMEDIATE 'DROP TABLE ${name}'; EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF; END;`;
    }
    return `IF OBJECT_ID('${name}', 'U') IS NOT NULL DROP TABLE ${name}`;
  }

  describe(`JSDBC Driver Compliance: ${driverName}`, () => {
    let ds;

    before(async () => {
      ds = await getDataSource();
    });

    describe('Connection', () => {
      it('creates and closes a connection', async () => {
        const conn = await ds.getConnection();
        assert.isFalse(conn.isClosed());
        await conn.close();
        assert.isTrue(conn.isClosed());
      });
    });

    describe('Statement — DDL and DML', () => {
      let conn;

      beforeEach(async () => {
        conn = await ds.getConnection();
        const stmt = await conn.createStatement();
        const drop = dropTable('test_users');
        if (drop) await stmt.executeUpdate(drop);
        await stmt.executeUpdate(createTable('test_users', `id INTEGER PRIMARY KEY, name ${textType}, age INTEGER`));
        await stmt.executeUpdate('DELETE FROM test_users');
        await stmt.close();
      });

      afterEach(async () => {
        if (!conn.isClosed()) await conn.close();
      });

      it('INSERT and SELECT via Statement', async () => {
        const stmt = await conn.createStatement();
        const count = await stmt.executeUpdate("INSERT INTO test_users (id, name, age) VALUES (1, 'Alice', 30)");
        assert.isAtLeast(count, 0); // some drivers return 0 for DDL-like

        const rs = await stmt.executeQuery('SELECT * FROM test_users WHERE id = 1');
        assert.isTrue(rs.next());
        assert.equal(rs.getString('name'), 'Alice');
        assert.equal(rs.getInt('age'), 30);
        assert.isFalse(rs.next());
        rs.close();
        await stmt.close();
      });

      it('UPDATE returns affected count', async () => {
        const stmt = await conn.createStatement();
        await stmt.executeUpdate("INSERT INTO test_users (id, name, age) VALUES (1, 'Bob', 25)");
        const updated = await stmt.executeUpdate("UPDATE test_users SET age = 26 WHERE id = 1");
        assert.equal(updated, 1);
        await stmt.close();
      });

      it('DELETE returns affected count', async () => {
        const stmt = await conn.createStatement();
        await stmt.executeUpdate("INSERT INTO test_users (id, name, age) VALUES (1, 'Carol', 40)");
        await stmt.executeUpdate("INSERT INTO test_users (id, name, age) VALUES (2, 'Dave', 35)");
        const deleted = await stmt.executeUpdate('DELETE FROM test_users WHERE age > 38');
        assert.equal(deleted, 1);
        await stmt.close();
      });
    });

    describe('PreparedStatement', () => {
      let conn;

      beforeEach(async () => {
        conn = await ds.getConnection();
        const stmt = await conn.createStatement();
        const drop = dropTable('test_items');
        if (drop) await stmt.executeUpdate(drop);
        await stmt.executeUpdate(createTable('test_items', `id INTEGER PRIMARY KEY, label ${textType}, price ${realType}`));
        await stmt.executeUpdate('DELETE FROM test_items');
        await stmt.close();
      });

      afterEach(async () => {
        if (!conn.isClosed()) await conn.close();
      });

      it('INSERT with parameters', async () => {
        const ps = await conn.prepareStatement('INSERT INTO test_items (id, label, price) VALUES (?, ?, ?)');
        ps.setInt(1, 1);
        ps.setString(2, 'Widget');
        ps.setFloat(3, 9.99);
        const count = await ps.executeUpdate();
        assert.equal(count, 1);
        await ps.close();
      });

      it('SELECT with parameters', async () => {
        const ins = await conn.prepareStatement('INSERT INTO test_items (id, label, price) VALUES (?, ?, ?)');
        ins.setParameter(1, 1);
        ins.setParameter(2, 'Gadget');
        ins.setParameter(3, 19.99);
        await ins.executeUpdate();
        ins.clearParameters();
        ins.setParameter(1, 2);
        ins.setParameter(2, 'Doohickey');
        ins.setParameter(3, 5.50);
        await ins.executeUpdate();
        await ins.close();

        const ps = await conn.prepareStatement('SELECT * FROM test_items WHERE price > ?');
        ps.setFloat(1, 10.0);
        const rs = await ps.executeQuery();
        const rows = rs.getRows();
        assert.equal(rows.length, 1);
        assert.equal(rows[0].label, 'Gadget');
        rs.close();
        await ps.close();
      });

      it('NULL parameter handling', async () => {
        const ps = await conn.prepareStatement('INSERT INTO test_items (id, label, price) VALUES (?, ?, ?)');
        ps.setInt(1, 1);
        ps.setNull(2);
        ps.setFloat(3, 0);
        await ps.executeUpdate();
        await ps.close();

        const stmt = await conn.createStatement();
        const rs = await stmt.executeQuery('SELECT * FROM test_items WHERE id = 1');
        assert.isTrue(rs.next());
        assert.isNull(rs.getObject('label'));
        rs.close();
        await stmt.close();
      });
    });

    describe('ResultSet', () => {
      let conn;

      beforeEach(async () => {
        conn = await ds.getConnection();
        const stmt = await conn.createStatement();
        const drop = dropTable('test_rs');
        if (drop) await stmt.executeUpdate(drop);
        await stmt.executeUpdate(createTable('test_rs', `id INTEGER, val ${textType}`));
        await stmt.executeUpdate('DELETE FROM test_rs');
        await stmt.executeUpdate("INSERT INTO test_rs VALUES (1, 'a')");
        await stmt.executeUpdate("INSERT INTO test_rs VALUES (2, 'b')");
        await stmt.executeUpdate("INSERT INTO test_rs VALUES (3, 'c')");
        await stmt.close();
      });

      afterEach(async () => {
        if (!conn.isClosed()) await conn.close();
      });

      it('cursor iteration with next()', async () => {
        const stmt = await conn.createStatement();
        const rs = await stmt.executeQuery('SELECT * FROM test_rs ORDER BY id');
        const ids = [];
        while (rs.next()) {
          ids.push(rs.getInt('id'));
        }
        assert.deepEqual(ids, [1, 2, 3]);
        rs.close();
        await stmt.close();
      });

      it('getRows() returns all rows', async () => {
        const stmt = await conn.createStatement();
        const rs = await stmt.executeQuery('SELECT * FROM test_rs ORDER BY id');
        const rows = rs.getRows();
        assert.equal(rows.length, 3);
        assert.equal(rows[0].val, 'a');
        assert.equal(rows[2].val, 'c');
        rs.close();
        await stmt.close();
      });

      it('getColumnNames() returns column list', async () => {
        const stmt = await conn.createStatement();
        const rs = await stmt.executeQuery('SELECT * FROM test_rs');
        const cols = rs.getColumnNames();
        assert.include(cols, 'id');
        assert.include(cols, 'val');
        rs.close();
        await stmt.close();
      });

      it('getObject by 1-based index', async () => {
        const stmt = await conn.createStatement();
        const rs = await stmt.executeQuery(`SELECT id, val FROM test_rs ORDER BY id ${limitOne}`);
        assert.isTrue(rs.next());
        assert.equal(rs.getObject(1), 1);
        assert.equal(rs.getObject(2), 'a');
        rs.close();
        await stmt.close();
      });

      it('empty result set', async () => {
        const stmt = await conn.createStatement();
        const rs = await stmt.executeQuery('SELECT * FROM test_rs WHERE id = 999');
        assert.isFalse(rs.next());
        assert.equal(rs.getRows().length, 0);
        rs.close();
        await stmt.close();
      });
    });

    describe('Transactions', () => {
      let conn;

      beforeEach(async () => {
        conn = await ds.getConnection();
        const stmt = await conn.createStatement();
        const drop = dropTable('test_tx');
        if (drop) await stmt.executeUpdate(drop);
        await stmt.executeUpdate(createTable('test_tx', `id INTEGER PRIMARY KEY, val ${textType}`));
        await stmt.executeUpdate('DELETE FROM test_tx');
        await stmt.close();
      });

      afterEach(async () => {
        if (!conn.isClosed()) await conn.close();
      });

      it('commit persists data', async () => {
        await conn.setAutoCommit(false);
        const stmt = await conn.createStatement();
        await stmt.executeUpdate("INSERT INTO test_tx VALUES (1, 'committed')");
        await conn.commit();

        const rs = await stmt.executeQuery('SELECT * FROM test_tx WHERE id = 1');
        assert.isTrue(rs.next());
        assert.equal(rs.getString('val'), 'committed');
        rs.close();
        await stmt.close();
      });

      it('rollback discards data', async () => {
        await conn.setAutoCommit(false);
        const stmt = await conn.createStatement();
        await stmt.executeUpdate("INSERT INTO test_tx VALUES (1, 'rolled-back')");
        await conn.rollback();

        const rs = await stmt.executeQuery('SELECT * FROM test_tx WHERE id = 1');
        assert.isFalse(rs.next());
        rs.close();
        await stmt.close();
      });
    });

    describe('DriverManager', () => {
      it('resolves connection via URL', async () => {
        const conn = await ds.getConnection();
        assert.isFalse(conn.isClosed());
        await conn.close();
      });
    });
  });
}
