import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqlite'; // registers driver
import driverComplianceTests from '../../core/test/driverCompliance.js';

driverComplianceTests('better-sqlite3', async () => {
  return new DataSource({ url: 'jsdbc:sqlite::memory:' });
});
