/**
 * JsdbcTemplate — Spring-inspired template for JSDBC database access.
 *
 * Simplifies JSDBC database operations by managing connections,
 * statements, and result set processing. Port of Spring's JdbcTemplate.
 */
export default class JsdbcTemplate {
  /**
   * @param {DataSource} dataSource
   */
  constructor(dataSource) {
    this._dataSource = dataSource;
  }

  /**
   * Execute a query and map each row using a RowMapper.
   *
   * @param {string} sql — SQL with ? placeholders
   * @param {Array} [params=[]] — parameter values
   * @param {Function} rowMapper — (row, rowNum) → mapped object
   * @returns {Promise<Array>}
   */
  async queryForList(sql, params = [], rowMapper = (row) => row) {
    const conn = await this._dataSource.getConnection();
    try {
      const ps = await conn.prepareStatement(sql);
      params.forEach((val, i) => ps.setParameter(i + 1, val));
      const rs = await ps.executeQuery();
      const rows = rs.getRows();
      rs.close();
      await ps.close();
      return rows.map((row, i) => rowMapper(row, i));
    } finally {
      await conn.close();
    }
  }

  /**
   * Execute a query expecting exactly one row.
   * Throws if zero or more than one row returned.
   *
   * @param {string} sql
   * @param {Array} [params=[]]
   * @param {Function} [rowMapper]
   * @returns {Promise<Object>}
   */
  async queryForObject(sql, params = [], rowMapper = (row) => row) {
    const results = await this.queryForList(sql, params, rowMapper);
    if (results.length === 0) {
      throw new Error('Expected one row but got none');
    }
    if (results.length > 1) {
      throw new Error(`Expected one row but got ${results.length}`);
    }
    return results[0];
  }

  /**
   * Execute a query and return the first row as a key-value map.
   *
   * @param {string} sql
   * @param {Array} [params=[]]
   * @returns {Promise<Object>}
   */
  async queryForMap(sql, params = []) {
    return this.queryForObject(sql, params);
  }

  /**
   * Execute an INSERT, UPDATE, or DELETE.
   *
   * @param {string} sql
   * @param {Array} [params=[]]
   * @returns {Promise<number>} affected row count
   */
  async update(sql, params = []) {
    const conn = await this._dataSource.getConnection();
    try {
      const ps = await conn.prepareStatement(sql);
      params.forEach((val, i) => ps.setParameter(i + 1, val));
      const count = await ps.executeUpdate();
      await ps.close();
      return count;
    } finally {
      await conn.close();
    }
  }

  /**
   * Execute a batch of updates with different parameter sets.
   *
   * @param {string} sql
   * @param {Array<Array>} paramsArray — array of parameter arrays
   * @returns {Promise<number[]>} array of affected row counts
   */
  async batchUpdate(sql, paramsArray) {
    const conn = await this._dataSource.getConnection();
    try {
      const results = [];
      for (const params of paramsArray) {
        const ps = await conn.prepareStatement(sql);
        params.forEach((val, i) => ps.setParameter(i + 1, val));
        results.push(await ps.executeUpdate());
        await ps.close();
      }
      return results;
    } finally {
      await conn.close();
    }
  }

  /**
   * Execute a DDL statement (CREATE, DROP, ALTER, etc.).
   *
   * @param {string} sql
   * @returns {Promise<void>}
   */
  async execute(sql) {
    const conn = await this._dataSource.getConnection();
    try {
      const stmt = await conn.createStatement();
      await stmt.executeUpdate(sql);
      await stmt.close();
    } finally {
      await conn.close();
    }
  }

  /**
   * Execute a callback within a transaction. Commits on success, rolls back on error.
   *
   * The callback receives a TransactionTemplate with the same API as JsdbcTemplate
   * but using a single connection.
   *
   * @param {Function} callback — async (tx) => { ... }
   * @returns {Promise<*>} callback result
   */
  async executeInTransaction(callback) {
    const conn = await this._dataSource.getConnection();
    await conn.setAutoCommit(false);
    const tx = new TransactionTemplate(conn);
    try {
      const result = await callback(tx);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      await conn.close();
    }
  }
}

/**
 * TransactionTemplate — JsdbcTemplate-like API bound to a single connection.
 * Used inside executeInTransaction callbacks.
 */
class TransactionTemplate {
  constructor(connection) {
    this._conn = connection;
  }

  async queryForList(sql, params = [], rowMapper = (row) => row) {
    const ps = await this._conn.prepareStatement(sql);
    params.forEach((val, i) => ps.setParameter(i + 1, val));
    const rs = await ps.executeQuery();
    const rows = rs.getRows();
    rs.close();
    await ps.close();
    return rows.map((row, i) => rowMapper(row, i));
  }

  async queryForObject(sql, params = [], rowMapper = (row) => row) {
    const results = await this.queryForList(sql, params, rowMapper);
    if (results.length === 0) throw new Error('Expected one row but got none');
    if (results.length > 1) throw new Error(`Expected one row but got ${results.length}`);
    return results[0];
  }

  async update(sql, params = []) {
    const ps = await this._conn.prepareStatement(sql);
    params.forEach((val, i) => ps.setParameter(i + 1, val));
    const count = await ps.executeUpdate();
    await ps.close();
    return count;
  }

  async execute(sql) {
    const stmt = await this._conn.createStatement();
    await stmt.executeUpdate(sql);
    await stmt.close();
  }
}

export { TransactionTemplate };
