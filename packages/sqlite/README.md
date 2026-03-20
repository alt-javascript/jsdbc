# @alt-javascript/jsdbc-sqlite

[![npm version](https://img.shields.io/npm/v/%40alt-javascript%2Fjsdbc-sqlite)](https://www.npmjs.com/package/@alt-javascript/jsdbc-sqlite)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml/badge.svg)](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml)

JSDBC driver for SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3). Provides high-performance, synchronous SQLite access through the async JSDBC interface.

**Part of the [@alt-javascript/jsdbc](https://github.com/alt-javascript/jsdbc) monorepo.**

## Install

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-sqlite
```

> **Note:** `better-sqlite3` includes a native C++ addon. Prebuilt binaries are available for most platforms. If none match, a C++ compiler is required.

## Usage

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqlite'; // self-registers with DriverManager

// File-based database
const ds = new DataSource({ url: 'jsdbc:sqlite:./myapp.db' });

// In-memory database
const ds = new DataSource({ url: 'jsdbc:sqlite::memory:' });

const conn = await ds.getConnection();
const stmt = await conn.createStatement();
await stmt.executeUpdate('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)');

const ps = await conn.prepareStatement('INSERT INTO items (name) VALUES (?)');
ps.setParameter(1, 'Widget');
await ps.executeUpdate();

await conn.close();
```

## URL Scheme

```
jsdbc:sqlite:<path-or-memory>
```

| URL | Description |
|---|---|
| `jsdbc:sqlite:./data/app.db` | File-based database at relative path |
| `jsdbc:sqlite:/var/lib/app.db` | File-based database at absolute path |
| `jsdbc:sqlite::memory:` | In-memory database (lost when connection closes) |

## When to Use

- **Node.js server applications** needing embedded SQL without a separate database server
- **CLI tools and scripts** with local data storage
- **Testing** with disposable in-memory databases

For browser environments, use [`@alt-javascript/jsdbc-sqljs`](https://www.npmjs.com/package/@alt-javascript/jsdbc-sqljs) instead.

## License

MIT
