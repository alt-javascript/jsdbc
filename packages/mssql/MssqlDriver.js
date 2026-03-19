/**
 * MssqlDriver — JSDBC driver for Microsoft SQL Server via tedious.
 *
 * URL scheme: jsdbc:mssql://host:port/database
 * Self-registers with DriverManager on import.
 */
import { Driver, DriverManager } from '@alt-javascript/jsdbc-core';
import MssqlConnection from './MssqlConnection.js';
import { Connection as TediousConnection } from 'tedious';

export default class MssqlDriver extends Driver {
  acceptsURL(url) {
    return url.startsWith('jsdbc:mssql:');
  }

  async connect(url, properties = {}) {
    // Parse jsdbc:mssql://host:port/database
    const stripped = url.replace(/^jsdbc:mssql:\/\//, '');
    const [hostPort, database] = stripped.split('/');
    const [host, portStr] = hostPort.split(':');
    const port = portStr ? parseInt(portStr, 10) : 1433;

    const config = {
      server: host,
      options: {
        database: database || 'master',
        port,
        encrypt: false,
        trustServerCertificate: true,
        rowCollectionOnRequestCompletion: true,
      },
      authentication: {
        type: 'default',
        options: {
          userName: properties.username || '',
          password: properties.password || '',
        },
      },
    };

    return new Promise((resolve, reject) => {
      const conn = new TediousConnection(config);
      conn.on('connect', (err) => {
        if (err) return reject(err);
        resolve(new MssqlConnection(conn));
      });
      conn.connect();
    });
  }
}

DriverManager.registerDriver(new MssqlDriver());
