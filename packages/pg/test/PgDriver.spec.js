import driverComplianceTests from '@alt-javascript/jsdbc-core/test/driverCompliance.js';
import { DataSource } from '@alt-javascript/jsdbc-core';
import '../index.js';

driverComplianceTests('PostgreSQL (pg)', () => {
  return new DataSource({
    url: 'jsdbc:pg://localhost:5432/jsdbctest',
    username: 'jsdbc',
    password: 'jsdbc',
  });
});
