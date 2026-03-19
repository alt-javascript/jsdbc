/**
 * OracleConnection — JSDBC Connection wrapping an oracledb connection.
 */
import { Connection } from '@alt-javascript/jsdbc-core';
import oracledb from 'oracledb';
import OracleStatement from './OracleStatement.js';
import OraclePreparedStatement from './OraclePreparedStatement.js';

// Return rows as objects, not arrays
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
// Don't auto-commit — we manage this explicitly
oracledb.autoCommit = false;

export default class OracleConnection extends Connection {
  constructor(conn) {
    super();
    this._conn = conn;
    this._autoCommit = true;
  }

  async _createStatement() {
    return new OracleStatement(this);
  }

  async _prepareStatement(sql) {
    return new OraclePreparedStatement(this, sql);
  }

  async _setAutoCommit(autoCommit) {
    this._autoCommit = autoCommit;
  }

  async _commit() {
    await this._conn.commit();
  }

  async _rollback() {
    await this._conn.rollback();
  }

  async close() {
    if (!this._closed) {
      await this._conn.close();
      this._closed = true;
    }
  }
}
