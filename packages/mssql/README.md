# @alt-javascript/jsdbc-mssql

[![npm version](https://img.shields.io/npm/v/%40alt-javascript%2Fjsdbc-mssql)](https://www.npmjs.com/package/@alt-javascript/jsdbc-mssql)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml/badge.svg)](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml)

JSDBC driver for Microsoft SQL Server via [tedious](https://github.com/tediousjs/tedious). Pure JavaScript TDS protocol implementation, no native dependencies.

**Part of the [@alt-javascript/jsdbc](https://github.com/alt-javascript/jsdbc) monorepo.**

## Install

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-mssql
```

## Usage

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-mssql'; // self-registers with DriverManager

const ds = new DataSource({
  url: 'jsdbc:mssql://localhost:1433/mydb',
  username: 'sa',
  password: 'MyPassword1!',
});

const conn = await ds.getConnection();
const ps = await conn.prepareStatement('SELECT * FROM users WHERE id = ?');
ps.setParameter(1, 42);
const rs = await ps.executeQuery();
console.log(rs.getRows());
rs.close();
await conn.close();
```

## URL Scheme

```
jsdbc:mssql://<host>:<port>/<database>
```

## Placeholder Conversion

JSDBC uses `?` placeholders. The driver converts them to SQL Server's `@p0`, `@p1`, ... syntax automatically.

## Compatibility

Works with SQL Server 2016+, Azure SQL Database, and Azure SQL Edge.

## License

MIT
