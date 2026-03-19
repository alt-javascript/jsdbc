/**
 * MssqlConnection — JSDBC Connection wrapping a tedious Connection.
 */
import { Connection } from '@alt-javascript/jsdbc-core';
import { Request, TYPES } from 'tedious';
import MssqlStatement from './MssqlStatement.js';
import MssqlPreparedStatement from './MssqlPreparedStatement.js';

export default class MssqlConnection extends Connection {
  constructor(conn) {
    super();
    this._conn = conn;
  }

  async _createStatement() {
    return new MssqlStatement(this);
  }

  async _prepareStatement(sql) {
    return new MssqlPreparedStatement(this, sql);
  }

  async _setAutoCommit(autoCommit) {
    if (!autoCommit) {
      await new Promise((resolve, reject) => {
        this._conn.beginTransaction((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }
  }

  async _commit() {
    await new Promise((resolve, reject) => {
      this._conn.commitTransaction((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async _rollback() {
    await new Promise((resolve, reject) => {
      this._conn.rollbackTransaction((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async close() {
    if (!this._closed) {
      this._conn.close();
      this._closed = true;
    }
  }

  /**
   * Execute raw SQL returning { rows, rowCount, columns }.
   * Internal helper used by Statement and PreparedStatement.
   */
  execSql(sql, params = []) {
    return new Promise((resolve, reject) => {
      const rows = [];
      let columns = [];
      let rowCount = 0;

      const request = new Request(sql, (err, rc) => {
        if (err) return reject(err);
        rowCount = rc;
        resolve({ rows, rowCount, columns });
      });

      // Bind parameters
      params.forEach((p, i) => {
        if (p === null || p === undefined) {
          request.addParameter(`p${i}`, TYPES.NVarChar, null);
        } else if (typeof p === 'number') {
          if (Number.isInteger(p)) {
            request.addParameter(`p${i}`, TYPES.Int, p);
          } else {
            request.addParameter(`p${i}`, TYPES.Float, p);
          }
        } else {
          request.addParameter(`p${i}`, TYPES.NVarChar, String(p));
        }
      });

      request.on('row', (tediousColumns) => {
        if (columns.length === 0) {
          columns = tediousColumns.map((c) => c.metadata.colName);
        }
        const row = {};
        tediousColumns.forEach((col) => {
          row[col.metadata.colName] = col.value;
        });
        rows.push(row);
      });

      this._conn.execSql(request);
    });
  }

  /** Simple exec with no result processing. */
  _execSql(sql) {
    return new Promise((resolve, reject) => {
      const request = new Request(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
      this._conn.execSql(request);
    });
  }
}
