import driverComplianceTests from '@alt-javascript/jsdbc-core/test/driverCompliance.js';
import { DataSource } from '@alt-javascript/jsdbc-core';
import '../index.js';

driverComplianceTests('MySQL/MariaDB (mysql2)', () => {
  return new DataSource({
    url: 'jsdbc:mysql://localhost:3306/jsdbctest',
    username: 'jsdbc',
    password: 'jsdbc',
  });
});
