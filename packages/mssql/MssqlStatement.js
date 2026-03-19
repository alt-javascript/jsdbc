/**
 * MssqlStatement — Executes ad-hoc SQL against SQL Server.
 */
import { Statement, ResultSet } from '@alt-javascript/jsdbc-core';

export default class MssqlStatement extends Statement {
  async _executeQuery(sql) {
    const { rows, columns } = await this._connection.execSql(sql);
    return new ResultSet(rows, columns);
  }

  async _executeUpdate(sql) {
    const { rowCount } = await this._connection.execSql(sql);
    return rowCount ?? 0;
  }

  async _execute(sql) {
    const { rows } = await this._connection.execSql(sql);
    return rows.length > 0;
  }
}
