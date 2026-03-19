/**
 * OraclePreparedStatement — Parameterised SQL for Oracle Database.
 *
 * Converts JSDBC ? placeholders to Oracle :0, :1, ... bind syntax.
 */
import { PreparedStatement, ResultSet } from '@alt-javascript/jsdbc-core';

function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `:${idx++}`);
}

export default class OraclePreparedStatement extends PreparedStatement {
  async _executePreparedQuery(sql, params) {
    const oraSql = convertPlaceholders(sql);
    const result = await this._connection._conn.execute(oraSql, params, {
      autoCommit: this._connection._autoCommit,
    });
    const columns = result.metaData.map((m) => m.name.toLowerCase());
    const rows = (result.rows || []).map((row) => {
      const mapped = {};
      for (const [key, val] of Object.entries(row)) {
        mapped[key.toLowerCase()] = val;
      }
      return mapped;
    });
    return new ResultSet(rows, columns);
  }

  async _executePreparedUpdate(sql, params) {
    const oraSql = convertPlaceholders(sql);
    const result = await this._connection._conn.execute(oraSql, params, {
      autoCommit: this._connection._autoCommit,
    });
    return result.rowsAffected ?? 0;
  }
}
