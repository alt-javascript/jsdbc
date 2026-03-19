import driverComplianceTests from '@alt-javascript/jsdbc-core/test/driverCompliance.js';
import { DataSource } from '@alt-javascript/jsdbc-core';
import '../index.js';

driverComplianceTests('Oracle (oracledb Thin)', () => {
  return new DataSource({
    url: 'jsdbc:oracle://localhost:1521/FREEPDB1',
    username: 'jsdbc',
    password: 'jsdbc',
  });
}, {
  limitOne: 'FETCH FIRST 1 ROWS ONLY',
  realType: 'NUMBER(10,2)',
  textType: 'VARCHAR2(255)',
  ifNotExists: false,
  dropSyntax: 'oracle',
});
