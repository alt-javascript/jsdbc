import driverComplianceTests from '@alt-javascript/jsdbc-core/test/driverCompliance.js';
import { DataSource } from '@alt-javascript/jsdbc-core';
import '../index.js';

driverComplianceTests('Teradata (teradatasql)', () => {
  return new DataSource({
    url: 'jsdbc:teradata://localhost:1025/jsdbctest',
    username: 'dbc',
    password: 'dbc',
  });
}, {
  limitOne: 'SAMPLE 1',
  realType: 'FLOAT',
  textType: 'VARCHAR(255)',
  ifNotExists: false,
  dropSyntax: 'teradata',
  ignoreDropError: true,
});
