/**
 * TeradataDriver — JSDBC driver for Teradata via the `teradatasql` package.
 *
 * URL scheme: jsdbc:teradata://host:port/database
 *             jsdbc:teradata://host/database
 *             jsdbc:teradata://host          (uses user's default database)
 *
 * Self-registers with DriverManager on import.
 */
import { Driver, DriverManager } from '@alt-javascript/jsdbc-core';
import TeradataConnection from './TeradataConnection.js';
import teradatasql from 'teradatasql';

export default class TeradataDriver extends Driver {
  static URL_PREFIX = 'jsdbc:teradata:';

  /**
   * @param {string} url
   * @returns {boolean}
   */
  acceptsURL(url) {
    return typeof url === 'string' && url.startsWith(TeradataDriver.URL_PREFIX);
  }

  /**
   * @param {string} url — jsdbc:teradata://host:port/database
   * @param {Object} [properties] — { username, password, ...extraParams }
   * @returns {Promise<TeradataConnection>}
   */
  async connect(url, properties = {}) {
    // Strip jsdbc:teradata:// prefix to get host:port/database
    const stripped = url.replace(/^jsdbc:teradata:\/\//, '');

    // Parse host[:port][/database]
    const slashIdx = stripped.indexOf('/');
    const hostPart = slashIdx === -1 ? stripped : stripped.substring(0, slashIdx);
    const database  = slashIdx === -1 ? undefined : stripped.substring(slashIdx + 1) || undefined;

    const colonIdx = hostPart.lastIndexOf(':');
    const host = colonIdx === -1 ? hostPart : hostPart.substring(0, colonIdx);
    const port = colonIdx === -1 ? undefined : hostPart.substring(colonIdx + 1);

    const params = {
      host,
      user: properties.username,
      password: properties.password,
    };

    if (port) params.dbs_port = port;
    if (database) params.database = database;

    // Pass through any extra driver-level properties (e.g. logmech, encryptdata)
    for (const [k, v] of Object.entries(properties)) {
      if (k !== 'username' && k !== 'password') {
        params[k] = v;
      }
    }

    const con = await teradatasql.connectAsync(params);
    return new TeradataConnection(con);
  }
}

// Self-register
DriverManager.registerDriver(new TeradataDriver());
