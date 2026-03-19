import { assert } from 'chai';
import { ResultSet, DriverManager } from '@alt-javascript/jsdbc-core';

describe('Core — ResultSet', () => {
  it('cursor iteration', () => {
    const rs = new ResultSet([{ id: 1, name: 'a' }, { id: 2, name: 'b' }], ['id', 'name']);
    assert.isTrue(rs.next());
    assert.equal(rs.getInt('id'), 1);
    assert.isTrue(rs.next());
    assert.equal(rs.getString('name'), 'b');
    assert.isFalse(rs.next());
  });

  it('getRows returns copies', () => {
    const rs = new ResultSet([{ id: 1 }], ['id']);
    const rows = rs.getRows();
    assert.equal(rows.length, 1);
    rows[0].id = 999;
    assert.equal(rs.getRows()[0].id, 1); // original unchanged
  });

  it('getObject by 1-based index', () => {
    const rs = new ResultSet([{ a: 10, b: 20 }], ['a', 'b']);
    rs.next();
    assert.equal(rs.getObject(1), 10);
    assert.equal(rs.getObject(2), 20);
  });

  it('throws when closed', () => {
    const rs = new ResultSet([{ id: 1 }]);
    rs.close();
    assert.throws(() => rs.next(), /closed/);
  });

  it('throws on invalid cursor position', () => {
    const rs = new ResultSet([{ id: 1 }]);
    assert.throws(() => rs.getRow(), /not on a valid row/);
  });
});

describe('Core — DriverManager', () => {
  it('throws when no driver matches', async () => {
    try {
      await DriverManager.getConnection('jsdbc:nonexistent:foo');
      assert.fail('should have thrown');
    } catch (e) {
      assert.include(e.message, 'No suitable driver');
    }
  });
});
