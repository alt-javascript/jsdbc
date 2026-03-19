import { assert } from 'chai';
import { SingleConnectionDataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqljs';
import { JsdbcTemplate, NamedParameterJsdbcTemplate, parseNamedParams } from '../index.js';

describe('JsdbcTemplate', () => {
  let template;
  let ds;

  beforeEach(async () => {
    ds = new SingleConnectionDataSource({ url: 'jsdbc:sqljs:memory' });
    template = new JsdbcTemplate(ds);
    await template.execute('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)');
  });

  afterEach(async () => {
    await ds.destroy();
  });

  describe('execute', () => {
    it('creates a table', async () => {
      await template.execute('CREATE TABLE test_exec (id INTEGER)');
      // Verify table exists by inserting into it
      const count = await template.update('INSERT INTO test_exec VALUES (?)', [1]);
      assert.equal(count, 1);
    });
  });

  describe('update', () => {
    it('inserts a row', async () => {
      const count = await template.update('INSERT INTO users (id, name, age) VALUES (?, ?, ?)', [1, 'Alice', 30]);
      assert.equal(count, 1);
    });

    it('updates a row', async () => {
      await template.update('INSERT INTO users (id, name, age) VALUES (?, ?, ?)', [1, 'Bob', 25]);
      const count = await template.update('UPDATE users SET age = ? WHERE id = ?', [26, 1]);
      assert.equal(count, 1);
    });

    it('deletes a row', async () => {
      await template.update('INSERT INTO users (id, name, age) VALUES (?, ?, ?)', [1, 'Carol', 40]);
      const count = await template.update('DELETE FROM users WHERE id = ?', [1]);
      assert.equal(count, 1);
    });
  });

  describe('queryForList', () => {
    beforeEach(async () => {
      await template.update('INSERT INTO users VALUES (?, ?, ?)', [1, 'Alice', 30]);
      await template.update('INSERT INTO users VALUES (?, ?, ?)', [2, 'Bob', 25]);
      await template.update('INSERT INTO users VALUES (?, ?, ?)', [3, 'Carol', 35]);
    });

    it('returns all rows', async () => {
      const rows = await template.queryForList('SELECT * FROM users ORDER BY id');
      assert.equal(rows.length, 3);
      assert.equal(rows[0].name, 'Alice');
    });

    it('filters with params', async () => {
      const rows = await template.queryForList('SELECT * FROM users WHERE age > ?', [28]);
      assert.equal(rows.length, 2);
    });

    it('applies rowMapper', async () => {
      const names = await template.queryForList(
        'SELECT * FROM users ORDER BY id',
        [],
        (row) => row.name.toUpperCase(),
      );
      assert.deepEqual(names, ['ALICE', 'BOB', 'CAROL']);
    });

    it('returns empty array for no matches', async () => {
      const rows = await template.queryForList('SELECT * FROM users WHERE age > ?', [100]);
      assert.deepEqual(rows, []);
    });
  });

  describe('queryForObject', () => {
    beforeEach(async () => {
      await template.update('INSERT INTO users VALUES (?, ?, ?)', [1, 'Alice', 30]);
      await template.update('INSERT INTO users VALUES (?, ?, ?)', [2, 'Bob', 25]);
    });

    it('returns single row', async () => {
      const user = await template.queryForObject('SELECT * FROM users WHERE id = ?', [1]);
      assert.equal(user.name, 'Alice');
    });

    it('throws on no rows', async () => {
      try {
        await template.queryForObject('SELECT * FROM users WHERE id = ?', [999]);
        assert.fail('should have thrown');
      } catch (e) {
        assert.include(e.message, 'none');
      }
    });

    it('throws on multiple rows', async () => {
      try {
        await template.queryForObject('SELECT * FROM users');
        assert.fail('should have thrown');
      } catch (e) {
        assert.include(e.message, 'got 2');
      }
    });

    it('applies rowMapper', async () => {
      const name = await template.queryForObject(
        'SELECT * FROM users WHERE id = ?',
        [1],
        (row) => row.name,
      );
      assert.equal(name, 'Alice');
    });
  });

  describe('queryForMap', () => {
    it('returns single row as map', async () => {
      await template.update('INSERT INTO users VALUES (?, ?, ?)', [1, 'Alice', 30]);
      const map = await template.queryForMap('SELECT * FROM users WHERE id = ?', [1]);
      assert.equal(map.name, 'Alice');
      assert.equal(map.age, 30);
    });
  });

  describe('batchUpdate', () => {
    it('inserts multiple rows', async () => {
      const counts = await template.batchUpdate(
        'INSERT INTO users VALUES (?, ?, ?)',
        [[1, 'A', 20], [2, 'B', 30], [3, 'C', 40]],
      );
      assert.deepEqual(counts, [1, 1, 1]);
      const rows = await template.queryForList('SELECT * FROM users');
      assert.equal(rows.length, 3);
    });
  });

  describe('executeInTransaction', () => {
    it('commits on success', async () => {
      await template.executeInTransaction(async (tx) => {
        await tx.update('INSERT INTO users VALUES (?, ?, ?)', [1, 'Alice', 30]);
        await tx.update('INSERT INTO users VALUES (?, ?, ?)', [2, 'Bob', 25]);
      });

      const rows = await template.queryForList('SELECT * FROM users');
      assert.equal(rows.length, 2);
    });

    it('rolls back on error', async () => {
      try {
        await template.executeInTransaction(async (tx) => {
          await tx.update('INSERT INTO users VALUES (?, ?, ?)', [1, 'Alice', 30]);
          throw new Error('Intentional error');
        });
      } catch { /* expected */ }

      const rows = await template.queryForList('SELECT * FROM users');
      assert.equal(rows.length, 0);
    });

    it('returns callback result', async () => {
      const result = await template.executeInTransaction(async (tx) => {
        await tx.update('INSERT INTO users VALUES (?, ?, ?)', [1, 'Alice', 30]);
        return 'done';
      });
      assert.equal(result, 'done');
    });

    it('queries within transaction see uncommitted data', async () => {
      await template.executeInTransaction(async (tx) => {
        await tx.update('INSERT INTO users VALUES (?, ?, ?)', [1, 'Alice', 30]);
        const rows = await tx.queryForList('SELECT * FROM users');
        assert.equal(rows.length, 1);
      });
    });
  });
});

describe('NamedParameterJsdbcTemplate', () => {
  let namedTemplate;
  let ds;

  beforeEach(async () => {
    ds = new SingleConnectionDataSource({ url: 'jsdbc:sqljs:memory' });
    namedTemplate = new NamedParameterJsdbcTemplate(ds);
    await namedTemplate.execute('CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL)');
  });

  afterEach(async () => {
    await ds.destroy();
  });

  describe('parseNamedParams', () => {
    it('converts :params to ? placeholders', () => {
      const result = parseNamedParams('SELECT * FROM t WHERE id = :id AND name = :name');
      assert.equal(result.sql, 'SELECT * FROM t WHERE id = ? AND name = ?');
      assert.deepEqual(result.paramNames, ['id', 'name']);
    });

    it('handles repeated param names', () => {
      const result = parseNamedParams('SELECT * FROM t WHERE a = :val OR b = :val');
      assert.equal(result.sql, 'SELECT * FROM t WHERE a = ? OR b = ?');
      assert.deepEqual(result.paramNames, ['val', 'val']);
    });

    it('handles no params', () => {
      const result = parseNamedParams('SELECT * FROM t');
      assert.equal(result.sql, 'SELECT * FROM t');
      assert.deepEqual(result.paramNames, []);
    });
  });

  describe('CRUD with named params', () => {
    it('insert and query', async () => {
      await namedTemplate.update(
        'INSERT INTO products VALUES (:id, :name, :price)',
        { id: 1, name: 'Widget', price: 9.99 },
      );

      const product = await namedTemplate.queryForObject(
        'SELECT * FROM products WHERE id = :id',
        { id: 1 },
      );
      assert.equal(product.name, 'Widget');
      assert.closeTo(product.price, 9.99, 0.01);
    });

    it('queryForList with named params', async () => {
      await namedTemplate.update('INSERT INTO products VALUES (:id, :name, :price)', { id: 1, name: 'A', price: 5 });
      await namedTemplate.update('INSERT INTO products VALUES (:id, :name, :price)', { id: 2, name: 'B', price: 15 });
      await namedTemplate.update('INSERT INTO products VALUES (:id, :name, :price)', { id: 3, name: 'C', price: 25 });

      const rows = await namedTemplate.queryForList(
        'SELECT * FROM products WHERE price > :minPrice',
        { minPrice: 10 },
      );
      assert.equal(rows.length, 2);
    });

    it('batchUpdate with named params', async () => {
      const counts = await namedTemplate.batchUpdate(
        'INSERT INTO products VALUES (:id, :name, :price)',
        [
          { id: 1, name: 'A', price: 5 },
          { id: 2, name: 'B', price: 10 },
        ],
      );
      assert.deepEqual(counts, [1, 1]);
    });
  });
});
