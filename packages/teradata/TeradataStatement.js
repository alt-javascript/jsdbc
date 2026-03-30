/**
 * TeradataStatement — Executes ad-hoc SQL against a Teradata connection.
 *
 * A new cursor is created per statement execution, which matches Teradata's
 * cursor model (one active result set per cursor).
 */
import { Statement, ResultSet } from '@alt-javascript/jsdbc-core';
import { cursorToRowsAndColumns } from './cursorUtils.js';

export default class TeradataStatement extends Statement {
  async _executeQuery(sql) {
    const cursor = this._connection._con.cursor();
    try {
      cursor.execute(sql);
      const { rows, columns } = cursorToRowsAndColumns(cursor);
      return new ResultSet(rows, columns);
    } finally {
      cursor.close();
    }
  }

  async _executeUpdate(sql) {
    const cursor = this._connection._con.cursor();
    try {
      cursor.execute(sql);
      // teradatasql sets rowcount to the number of affected rows; -1 when not applicable
      return cursor.rowcount >= 0 ? cursor.rowcount : 0;
    } finally {
      cursor.close();
    }
  }

  async _execute(sql) {
    const cursor = this._connection._con.cursor();
    try {
      cursor.execute(sql);
      // Returns true when the execution produced a result set
      return cursor.description !== null && cursor.description.length > 0;
    } finally {
      cursor.close();
    }
  }
}
