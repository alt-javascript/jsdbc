/**
 * ResultSet — Represents the result of a query execution.
 *
 * Holds an array of row objects and provides cursor-based iteration
 * (like JDBC's ResultSet) plus convenience methods for bulk access.
 */
export default class ResultSet {
  /**
   * @param {Object[]} rows — array of plain objects {columnName: value}
   * @param {string[]} [columns] — column names in order
   */
  constructor(rows = [], columns = []) {
    this._rows = rows;
    this._columns = columns.length > 0 ? columns : (rows.length > 0 ? Object.keys(rows[0]) : []);
    this._cursor = -1;
    this._closed = false;
  }

  /**
   * Advance cursor to the next row.
   * @returns {boolean} true if there is a current row
   */
  next() {
    this._checkClosed();
    this._cursor++;
    return this._cursor < this._rows.length;
  }

  /**
   * Get a column value from the current row by name or 1-based index.
   * @param {string|number} columnNameOrIndex
   * @returns {*}
   */
  getObject(columnNameOrIndex) {
    this._checkClosed();
    this._checkCursor();
    const row = this._rows[this._cursor];
    if (typeof columnNameOrIndex === 'number') {
      const col = this._columns[columnNameOrIndex - 1];
      return row[col];
    }
    return row[columnNameOrIndex];
  }

  /**
   * Get string value from current row.
   * @param {string|number} columnNameOrIndex
   * @returns {string|null}
   */
  getString(columnNameOrIndex) {
    const val = this.getObject(columnNameOrIndex);
    return val == null ? null : String(val);
  }

  /**
   * Get integer value from current row.
   * @param {string|number} columnNameOrIndex
   * @returns {number|null}
   */
  getInt(columnNameOrIndex) {
    const val = this.getObject(columnNameOrIndex);
    return val == null ? null : Number(val);
  }

  /**
   * Get the current row as a plain object.
   * @returns {Object}
   */
  getRow() {
    this._checkClosed();
    this._checkCursor();
    return { ...this._rows[this._cursor] };
  }

  /**
   * Get all rows as an array of plain objects. Does not require cursor iteration.
   * @returns {Object[]}
   */
  getRows() {
    this._checkClosed();
    return this._rows.map((r) => ({ ...r }));
  }

  /**
   * Get column names.
   * @returns {string[]}
   */
  getColumnNames() {
    return [...this._columns];
  }

  /**
   * Get the number of rows.
   * @returns {number}
   */
  getRowCount() {
    return this._rows.length;
  }

  /** Close the result set and release resources. */
  close() {
    this._closed = true;
  }

  /** @returns {boolean} */
  isClosed() {
    return this._closed;
  }

  _checkClosed() {
    if (this._closed) throw new Error('ResultSet is closed');
  }

  _checkCursor() {
    if (this._cursor < 0 || this._cursor >= this._rows.length) {
      throw new Error('ResultSet cursor is not on a valid row');
    }
  }
}
