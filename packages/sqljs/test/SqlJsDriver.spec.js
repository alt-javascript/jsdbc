import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqljs'; // registers driver
import driverComplianceTests from '../../core/test/driverCompliance.js';

driverComplianceTests('sql.js', async () => {
  return new DataSource({ url: 'jsdbc:sqljs:memory' });
});
