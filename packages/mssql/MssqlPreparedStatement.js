/**
 * MssqlPreparedStatement — Parameterised SQL for SQL Server.
 *
 * Converts JSDBC ? placeholders to @p0, @p1, ... for tedious.
 */
import { PreparedStatement, ResultSet } from '@alt-javascript/jsdbc-core';

function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `@p${idx++}`);
}

export default class MssqlPreparedStatement extends PreparedStatement {
  async _executePreparedQuery(sql, params) {
    const msSql = convertPlaceholders(sql);
    const { rows, columns } = await this._connection.execSql(msSql, params);
    return new ResultSet(rows, columns);
  }

  async _executePreparedUpdate(sql, params) {
    const msSql = convertPlaceholders(sql);
    const { rowCount } = await this._connection.execSql(msSql, params);
    return rowCount ?? 0;
  }
}
