/**
 * OracleDriver — JSDBC driver for Oracle Database via oracledb (Thin mode).
 *
 * URL scheme: jsdbc:oracle://host:port/service
 * Self-registers with DriverManager on import.
 */
import { Driver, DriverManager } from '@alt-javascript/jsdbc-core';
import OracleConnection from './OracleConnection.js';
import oracledb from 'oracledb';

// Use Thin mode — pure JS, no native Oracle Client needed
oracledb.initOracleClient = undefined;

export default class OracleDriver extends Driver {
  acceptsURL(url) {
    return url.startsWith('jsdbc:oracle:');
  }

  async connect(url, properties = {}) {
    // jsdbc:oracle://host:port/service → host:port/service
    const stripped = url.replace(/^jsdbc:oracle:\/\//, '');
    const connectString = stripped; // host:port/service

    const conn = await oracledb.getConnection({
      user: properties.username,
      password: properties.password,
      connectString,
    });

    return new OracleConnection(conn);
  }
}

DriverManager.registerDriver(new OracleDriver());
