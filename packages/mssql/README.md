# @alt-javascript/jsdbc-mssql

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
