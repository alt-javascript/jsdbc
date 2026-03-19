/**
 * OracleStatement — Executes ad-hoc SQL against Oracle Database.
 */
import { Statement, ResultSet } from '@alt-javascript/jsdbc-core';

export default class OracleStatement extends Statement {
  async _executeQuery(sql) {
    const result = await this._connection._conn.execute(sql, [], {
      autoCommit: this._connection._autoCommit,
    });
    const columns = result.metaData.map((m) => m.name.toLowerCase());
    // Map Oracle's uppercase column names to lowercase for consistency
    const rows = (result.rows || []).map((row) => {
      const mapped = {};
      for (const [key, val] of Object.entries(row)) {
        mapped[key.toLowerCase()] = val;
      }
      return mapped;
    });
    return new ResultSet(rows, columns);
  }

  async _executeUpdate(sql) {
    const result = await this._connection._conn.execute(sql, [], {
      autoCommit: this._connection._autoCommit,
    });
    return result.rowsAffected ?? 0;
  }

  async _execute(sql) {
    const result = await this._connection._conn.execute(sql, [], {
      autoCommit: this._connection._autoCommit,
    });
    return result.metaData != null;
  }
}
