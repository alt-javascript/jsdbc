/**
 * PgStatement — Executes ad-hoc SQL against a PostgreSQL connection.
 */
import { Statement, ResultSet } from '@alt-javascript/jsdbc-core';

export default class PgStatement extends Statement {
  async _executeQuery(sql) {
    const result = await this._connection._client.query(sql);
    const columns = result.fields.map((f) => f.name);
    return new ResultSet(result.rows, columns);
  }

  async _executeUpdate(sql) {
    const result = await this._connection._client.query(sql);
    return result.rowCount ?? 0;
  }

  async _execute(sql) {
    const result = await this._connection._client.query(sql);
    return result.fields && result.fields.length > 0;
  }
}
