# @alt-javascript/jsdbc-sqljs

[![Language](https://img.shields.io/badge/language-JavaScript-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![npm version](https://img.shields.io/npm/v/%40alt-javascript%2Fjsdbc-sqljs)](https://www.npmjs.com/package/@alt-javascript/jsdbc-sqljs)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml/badge.svg)](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml)

JSDBC driver for SQLite via [sql.js](https://github.com/sql-js/sql.js) (WebAssembly). Runs the same SQL in Node.js and the browser — no native dependencies, no build step.

**Part of the [@alt-javascript/jsdbc](https://github.com/alt-javascript/jsdbc) monorepo.**

## Install

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-sqljs
```

## Usage

```javascript
import { SingleConnectionDataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqljs'; // self-registers with DriverManager

const ds = new SingleConnectionDataSource({ url: 'jsdbc:sqljs:memory' });
const conn = await ds.getConnection();

const stmt = await conn.createStatement();
await stmt.executeUpdate('CREATE TABLE notes (id INTEGER PRIMARY KEY, text TEXT)');

const ps = await conn.prepareStatement('INSERT INTO notes (text) VALUES (?)');
ps.setParameter(1, 'Hello from the browser');
await ps.executeUpdate();

const query = await conn.prepareStatement('SELECT * FROM notes');
const rs = await query.executeQuery();
console.log(rs.getRows()); // [{id: 1, text: 'Hello from the browser'}]

rs.close();
// Don't close conn — SingleConnectionDataSource keeps it alive
await ds.destroy(); // when truly done
```

## URL Scheme

```
jsdbc:sqljs:memory
```

Currently supports in-memory databases only. Each connection creates a new empty database — use `SingleConnectionDataSource` to share a single database instance across operations.

## Browser Usage

```html
<script type="module">
  import { SingleConnectionDataSource } from '@alt-javascript/jsdbc-core';
  import '@alt-javascript/jsdbc-sqljs';

  const ds = new SingleConnectionDataSource({ url: 'jsdbc:sqljs:memory' });
  const conn = await ds.getConnection();
  // Same API as Node.js
</script>
```

The sql.js WebAssembly binary (~1MB) is loaded automatically.

## When to Use

- **Browser applications** needing client-side SQL
- **Isomorphic code** that must run identically in Node.js and the browser
- **Testing** without native dependencies — CI environments with no C++ compiler
- **Offline-first apps** with in-memory data

For Node.js-only applications where performance matters, use [`@alt-javascript/jsdbc-sqlite`](https://www.npmjs.com/package/@alt-javascript/jsdbc-sqlite) (better-sqlite3) instead.

## License

MIT
