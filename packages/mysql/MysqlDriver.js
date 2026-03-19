/**
 * MysqlDriver — JSDBC driver for MySQL/MariaDB via the mysql2 package.
 *
 * URL scheme: jsdbc:mysql://host:port/database
 * Self-registers with DriverManager on import.
 */
import { Driver, DriverManager } from '@alt-javascript/jsdbc-core';
import MysqlConnection from './MysqlConnection.js';
import mysql from 'mysql2/promise';

export default class MysqlDriver extends Driver {
  acceptsURL(url) {
    return url.startsWith('jsdbc:mysql:');
  }

  async connect(url, properties = {}) {
    // jsdbc:mysql://host:port/database → mysql://host:port/database
    let uri = url.replace(/^jsdbc:mysql:/, 'mysql:');

    // Embed credentials if provided separately
    if (properties.username && uri.includes('//') && !uri.includes('@')) {
      const auth = properties.password
        ? `${properties.username}:${properties.password}`
        : properties.username;
      uri = uri.replace('//', `//${auth}@`);
    }

    const conn = await mysql.createConnection(uri);
    return new MysqlConnection(conn);
  }
}

DriverManager.registerDriver(new MysqlDriver());
