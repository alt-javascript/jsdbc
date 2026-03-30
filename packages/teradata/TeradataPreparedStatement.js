/**
 * TeradataPreparedStatement — Parameterised SQL execution for Teradata.
 *
 * teradatasql natively supports `?` parameter markers — no placeholder
 * conversion needed. Parameters are passed as an array to cursor.execute().
 */
import { PreparedStatement, ResultSet } from '@alt-javascript/jsdbc-core';
import { cursorToRowsAndColumns } from './cursorUtils.js';

export default class TeradataPreparedStatement extends PreparedStatement {
  async _executePreparedQuery(sql, params) {
    const cursor = this._connection._con.cursor();
    try {
      cursor.execute(sql, params);
      const { rows, columns } = cursorToRowsAndColumns(cursor);
      return new ResultSet(rows, columns);
    } finally {
      cursor.close();
    }
  }

  async _executePreparedUpdate(sql, params) {
    const cursor = this._connection._con.cursor();
    try {
      cursor.execute(sql, params);
      return cursor.rowcount >= 0 ? cursor.rowcount : 0;
    } finally {
      cursor.close();
    }
  }
}
