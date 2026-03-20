# @alt-javascript/jsdbc-pg

[![Language](https://img.shields.io/badge/language-JavaScript-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![npm version](https://img.shields.io/npm/v/%40alt-javascript%2Fjsdbc-pg)](https://www.npmjs.com/package/@alt-javascript/jsdbc-pg)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml/badge.svg)](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml)

JSDBC driver for PostgreSQL via [pg](https://github.com/brianc/node-postgres). Full PostgreSQL support through the async JSDBC interface.

**Part of the [@alt-javascript/jsdbc](https://github.com/alt-javascript/jsdbc) monorepo.**

## Install

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-pg
```

## Usage

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-pg'; // self-registers with DriverManager

const ds = new DataSource({
  url: 'jsdbc:pg://localhost:5432/mydb',
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
jsdbc:pg://<host>:<port>/<database>
```

| URL | Description |
|---|---|
| `jsdbc:pg://localhost:5432/mydb` | Local PostgreSQL on default port |
| `jsdbc:pg://db.example.com:5432/prod` | Remote PostgreSQL |

Credentials are passed via `DataSource` config (`username`, `password`) or embedded in the URL (`jsdbc:pg://user:pass@host:port/db`).

## Placeholder Conversion

JSDBC uses `?` placeholders (JDBC convention). The driver converts them to PostgreSQL's `$1`, `$2`, ... syntax automatically.

```javascript
// You write:
const ps = await conn.prepareStatement('SELECT * FROM users WHERE name = ? AND age > ?');
// Driver sends: SELECT * FROM users WHERE name = $1 AND age > $2
```

## License

MIT
