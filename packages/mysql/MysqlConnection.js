/**
 * MysqlConnection — JSDBC Connection wrapping a mysql2 promise connection.
 */
import { Connection } from '@alt-javascript/jsdbc-core';
import MysqlStatement from './MysqlStatement.js';
import MysqlPreparedStatement from './MysqlPreparedStatement.js';

export default class MysqlConnection extends Connection {
  constructor(conn) {
    super();
    this._conn = conn;
  }

  async _createStatement() {
    return new MysqlStatement(this);
  }

  async _prepareStatement(sql) {
    return new MysqlPreparedStatement(this, sql);
  }

  async _setAutoCommit(autoCommit) {
    if (!autoCommit) {
      await this._conn.beginTransaction();
    }
  }

  async _commit() {
    await this._conn.commit();
  }

  async _rollback() {
    await this._conn.rollback();
  }

  async close() {
    if (!this._closed) {
      await this._conn.end();
      this._closed = true;
    }
  }
}
