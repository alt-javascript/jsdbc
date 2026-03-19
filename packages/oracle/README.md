# @alt-javascript/jsdbc-oracle

JSDBC driver for Oracle Database via [oracledb](https://github.com/oracle/node-oracledb) Thin mode. Pure JavaScript — no Oracle Client installation required.

**Part of the [@alt-javascript/jsdbc](https://github.com/alt-javascript/jsdbc) monorepo.**

## Install

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-oracle
```

## Usage

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-oracle'; // self-registers with DriverManager

const ds = new DataSource({
  url: 'jsdbc:oracle://localhost:1521/FREEPDB1',
  username: 'myuser',
  password: 'mypass',
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
jsdbc:oracle://<host>:<port>/<service_name>
```

## Placeholder Conversion

JSDBC uses `?` placeholders. The driver converts them to Oracle's `:0`, `:1`, ... bind syntax automatically.

## Thin Mode

This driver uses oracledb's Thin mode (pure JavaScript). No Oracle Instant Client or native compilation required. Works on any platform Node.js supports.

## Compatibility

Works with Oracle Database 12.1+ and Oracle Free 23ai.

## License

MIT
