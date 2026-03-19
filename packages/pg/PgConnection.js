/**
 * PgConnection — JSDBC Connection wrapping a pg Client.
 */
import { Connection } from '@alt-javascript/jsdbc-core';
import PgStatement from './PgStatement.js';
import PgPreparedStatement from './PgPreparedStatement.js';

export default class PgConnection extends Connection {
  /**
   * @param {import('pg').Client} client
   */
  constructor(client) {
    super();
    this._client = client;
  }

  async _createStatement() {
    return new PgStatement(this);
  }

  async _prepareStatement(sql) {
    return new PgPreparedStatement(this, sql);
  }

  async _setAutoCommit(autoCommit) {
    if (!autoCommit) {
      await this._client.query('BEGIN');
    }
  }

  async _commit() {
    await this._client.query('COMMIT');
  }

  async _rollback() {
    await this._client.query('ROLLBACK');
  }

  async close() {
    if (!this._closed) {
      await this._client.end();
      this._closed = true;
    }
  }
}
