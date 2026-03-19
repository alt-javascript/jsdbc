/**
 * PgPreparedStatement — Parameterised SQL execution for PostgreSQL.
 *
 * Converts JSDBC ? placeholders to PostgreSQL $1, $2, ... syntax.
 */
import { PreparedStatement, ResultSet } from '@alt-javascript/jsdbc-core';

/**
 * Convert ? placeholders to $1, $2, ... for pg.
 * @param {string} sql
 * @returns {string}
 */
function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

export default class PgPreparedStatement extends PreparedStatement {
  async _executePreparedQuery(sql, params) {
    const pgSql = convertPlaceholders(sql);
    const result = await this._connection._client.query(pgSql, params);
    const columns = result.fields.map((f) => f.name);
    return new ResultSet(result.rows, columns);
  }

  async _executePreparedUpdate(sql, params) {
    const pgSql = convertPlaceholders(sql);
    const result = await this._connection._client.query(pgSql, params);
    return result.rowCount ?? 0;
  }
}
