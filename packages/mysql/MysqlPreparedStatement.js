/**
 * MysqlPreparedStatement — Parameterised SQL for MySQL/MariaDB.
 *
 * mysql2 uses ? placeholders natively — no conversion needed.
 */
import { PreparedStatement, ResultSet } from '@alt-javascript/jsdbc-core';

export default class MysqlPreparedStatement extends PreparedStatement {
  async _executePreparedQuery(sql, params) {
    const [rows, fields] = await this._connection._conn.execute(sql, params);
    const columns = fields.map((f) => f.name);
    return new ResultSet(rows, columns);
  }

  async _executePreparedUpdate(sql, params) {
    const [result] = await this._connection._conn.execute(sql, params);
    return result.affectedRows ?? 0;
  }
}
