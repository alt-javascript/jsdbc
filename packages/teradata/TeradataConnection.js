/**
 * TeradataConnection — JSDBC Connection wrapping a teradatasql connection.
 *
 * teradatasql connections default to autocommit=true.
 * Transactions are managed by setting con.autocommit and calling
 * con.commit() / con.rollback().
 */
import { Connection } from '@alt-javascript/jsdbc-core';
import TeradataStatement from './TeradataStatement.js';
import TeradataPreparedStatement from './TeradataPreparedStatement.js';

export default class TeradataConnection extends Connection {
  /**
   * @param {object} con — native teradatasql connection
   */
  constructor(con) {
    super();
    this._con = con;
    // Mirror the native default; used by Statement/PreparedStatement.
    this._autoCommit = true;
  }

  async _createStatement() {
    return new TeradataStatement(this);
  }

  async _prepareStatement(sql) {
    return new TeradataPreparedStatement(this, sql);
  }

  async _setAutoCommit(autoCommit) {
    this._autoCommit = autoCommit;
    // teradatasql exposes autocommit as a read/write attribute on the connection
    this._con.autocommit = autoCommit;
  }

  async _commit() {
    this._con.commit();
  }

  async _rollback() {
    this._con.rollback();
  }

  async close() {
    if (!this._closed) {
      this._con.close();
      this._closed = true;
    }
  }
}
