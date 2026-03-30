# @alt-javascript/jsdbc-teradata

[![Language](https://img.shields.io/badge/language-JavaScript-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![npm version](https://img.shields.io/npm/v/%40alt-javascript%2Fjsdbc-teradata)](https://www.npmjs.com/package/@alt-javascript/jsdbc-teradata)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml/badge.svg)](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml)

JSDBC driver for [Teradata](https://www.teradata.com/) via [teradatasql](https://www.npmjs.com/package/teradatasql). Full Teradata support through the async JSDBC interface.

**Part of the [@alt-javascript/jsdbc](https://github.com/alt-javascript/jsdbc) monorepo.**

## Install

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-teradata
```

> **Note:** `teradatasql` ships a platform-specific prebuilt binary. It requires 64-bit Node.js 18.20.7 or later and supports Windows x64, macOS (Intel and ARM), and Linux x64/ARM64.

## Usage

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-teradata'; // self-registers with DriverManager

const ds = new DataSource({
  url: 'jsdbc:teradata://my-teradata-host/mydb',
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
jsdbc:teradata://<host>[:<port>][/<database>]
```

| URL | Description |
|---|---|
| `jsdbc:teradata://myhost/mydb` | Default port (1025), explicit database |
| `jsdbc:teradata://myhost:1025/mydb` | Explicit port and database |
| `jsdbc:teradata://myhost` | Default port, user's default database |

Credentials are passed via `DataSource` config (`username`, `password`). Any additional properties are forwarded to `teradatasql.connectAsync()` — see the [teradatasql docs](https://github.com/Teradata/nodejs-driver) for the full parameter list (e.g. `logmech`, `encryptdata`, `logon_timeout`).

## Placeholder Syntax

JSDBC uses `?` placeholders (JDBC convention). Teradata supports `?` natively — no conversion is required.

```javascript
const ps = await conn.prepareStatement(
  'INSERT INTO orders (id, status, amount) VALUES (?, ?, ?)'
);
ps.setInt(1, 101);
ps.setString(2, 'pending');
ps.setFloat(3, 49.99);
await ps.executeUpdate();
```

## Transactions

```javascript
await conn.setAutoCommit(false);
try {
  const stmt = await conn.createStatement();
  await stmt.executeUpdate("INSERT INTO audit_log VALUES (1, 'login')");
  await conn.commit();
} catch (err) {
  await conn.rollback();
  throw err;
} finally {
  await conn.close();
}
```

## Compatibility

Requires Teradata Database 16.20 or later.

## License

MIT
