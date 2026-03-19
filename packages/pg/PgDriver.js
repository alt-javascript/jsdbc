/**
 * PgDriver — JSDBC driver for PostgreSQL via the `pg` package.
 *
 * URL scheme: jsdbc:pg://host:port/database
 * Self-registers with DriverManager on import.
 */
import { Driver, DriverManager } from '@alt-javascript/jsdbc-core';
import PgConnection from './PgConnection.js';
import pg from 'pg';

const { Client } = pg;

export default class PgDriver extends Driver {
  /**
   * @param {string} url
   * @returns {boolean}
   */
  acceptsURL(url) {
    return url.startsWith('jsdbc:pg:');
  }

  /**
   * @param {string} url — jsdbc:pg://host:port/database
   * @param {Object} [properties] — { username, password, ...pgOptions }
   * @returns {Promise<PgConnection>}
   */
  async connect(url, properties = {}) {
    // Strip jsdbc:pg: prefix → //host:port/database, then prepend postgresql:
    let connectionString = 'postgresql:' + url.replace(/^jsdbc:pg:/, '');

    // Embed credentials in the URL if provided separately
    if (properties.username && connectionString.includes('//') && !connectionString.includes('@')) {
      const auth = properties.password
        ? `${properties.username}:${properties.password}`
        : properties.username;
      connectionString = connectionString.replace('//', `//${auth}@`);
    }

    const client = new Client({ connectionString });

    await client.connect();
    return new PgConnection(client);
  }
}

// Self-register
DriverManager.registerDriver(new PgDriver());
