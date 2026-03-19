/**
 * MysqlStatement — Executes ad-hoc SQL against a MySQL/MariaDB connection.
 */
import { Statement, ResultSet } from '@alt-javascript/jsdbc-core';

export default class MysqlStatement extends Statement {
  async _executeQuery(sql) {
    const [rows, fields] = await this._connection._conn.query(sql);
    const columns = fields.map((f) => f.name);
    // rows from mysql2 are plain objects when not using rowsAsArray
    return new ResultSet(rows, columns);
  }

  async _executeUpdate(sql) {
    const [result] = await this._connection._conn.query(sql);
    return result.affectedRows ?? 0;
  }

  async _execute(sql) {
    const [result, fields] = await this._connection._conn.query(sql);
    return Array.isArray(result);
  }
}
