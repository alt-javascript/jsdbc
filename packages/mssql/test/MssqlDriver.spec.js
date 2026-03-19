import driverComplianceTests from '@alt-javascript/jsdbc-core/test/driverCompliance.js';
import { DataSource } from '@alt-javascript/jsdbc-core';
import '../index.js';

driverComplianceTests('SQL Server (tedious)', () => {
  return new DataSource({
    url: 'jsdbc:mssql://localhost:1433/jsdbctest',
    username: 'sa',
    password: 'Jsdbc_Pass1!',
  });
}, {
  limitOne: 'OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY',
  textType: 'NVARCHAR(255)',
  ifNotExists: false,
});
