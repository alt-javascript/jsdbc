/**
 * NamedParameterJsdbcTemplate — JsdbcTemplate with :paramName support.
 *
 * Parses SQL containing :namedParams and converts to ? placeholders
 * before delegating to JsdbcTemplate.
 */
import JsdbcTemplate from './JsdbcTemplate.js';

/**
 * Parse named parameters from SQL.
 * Converts `:paramName` to `?` and returns { sql, paramNames }.
 *
 * @param {string} sql — SQL with :paramName placeholders
 * @returns {{ sql: string, paramNames: string[] }}
 */
export function parseNamedParams(sql) {
  const paramNames = [];
  // Match :word but not ::word (escaped) and not inside quotes
  const parsed = sql.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, name) => {
    paramNames.push(name);
    return '?';
  });
  return { sql: parsed, paramNames };
}

export default class NamedParameterJsdbcTemplate {
  /**
   * @param {DataSource} dataSource
   */
  constructor(dataSource) {
    this._template = new JsdbcTemplate(dataSource);
    this._dataSource = dataSource;
  }

  /**
   * @param {string} sql — SQL with :paramName placeholders
   * @param {Object} paramMap — { paramName: value }
   * @param {Function} [rowMapper]
   * @returns {Promise<Array>}
   */
  async queryForList(sql, paramMap = {}, rowMapper = (row) => row) {
    const { sql: parsed, paramNames } = parseNamedParams(sql);
    const params = paramNames.map((name) => paramMap[name]);
    return this._template.queryForList(parsed, params, rowMapper);
  }

  /**
   * @param {string} sql
   * @param {Object} paramMap
   * @param {Function} [rowMapper]
   * @returns {Promise<Object>}
   */
  async queryForObject(sql, paramMap = {}, rowMapper = (row) => row) {
    const { sql: parsed, paramNames } = parseNamedParams(sql);
    const params = paramNames.map((name) => paramMap[name]);
    return this._template.queryForObject(parsed, params, rowMapper);
  }

  /**
   * @param {string} sql
   * @param {Object} paramMap
   * @returns {Promise<Object>}
   */
  async queryForMap(sql, paramMap = {}) {
    return this.queryForObject(sql, paramMap);
  }

  /**
   * @param {string} sql
   * @param {Object} paramMap
   * @returns {Promise<number>}
   */
  async update(sql, paramMap = {}) {
    const { sql: parsed, paramNames } = parseNamedParams(sql);
    const params = paramNames.map((name) => paramMap[name]);
    return this._template.update(parsed, params);
  }

  /**
   * @param {string} sql
   * @param {Array<Object>} paramMaps — array of { paramName: value }
   * @returns {Promise<number[]>}
   */
  async batchUpdate(sql, paramMaps) {
    const { sql: parsed, paramNames } = parseNamedParams(sql);
    const paramsArray = paramMaps.map((map) => paramNames.map((name) => map[name]));
    return this._template.batchUpdate(parsed, paramsArray);
  }

  /**
   * @param {string} sql
   * @returns {Promise<void>}
   */
  async execute(sql) {
    return this._template.execute(sql);
  }

  /**
   * @param {Function} callback
   * @returns {Promise<*>}
   */
  async executeInTransaction(callback) {
    return this._template.executeInTransaction(callback);
  }
}
