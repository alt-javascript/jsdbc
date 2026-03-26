# @alt-javascript/jsdbc-sqljs-localstorage

[![Language](https://img.shields.io/badge/language-JavaScript-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![npm version](https://img.shields.io/npm/v/%40alt-javascript%2Fjsdbc-sqljs-localstorage)](https://www.npmjs.com/package/@alt-javascript/jsdbc-sqljs-localstorage)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml/badge.svg)](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml)

JSDBC driver for SQLite via [sql.js](https://github.com/sql-js/sql.js) (WebAssembly) with automatic `localStorage` persistence. Write SQL in the browser — data survives page reloads and cross-session navigation.

**Part of the [@alt-javascript/jsdbc](https://github.com/alt-javascript/jsdbc) monorepo.**

## Install

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-sqljs-localstorage
```

## Usage

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqljs-localstorage'; // self-registers with DriverManager

// 'myapp-db' is the localStorage key where the database binary is stored.
const ds = new DataSource({ url: 'jsdbc:sqljs:localstorage:myapp-db' });

// First visit — empty database, table does not exist yet.
const conn = await ds.getConnection();
const stmt = await conn.createStatement();
await stmt.executeUpdate('CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, text TEXT)');

const ps = await conn.prepareStatement('INSERT INTO notes (text) VALUES (?)');
ps.setParameter(1, 'Hello, persistent world!');
await ps.executeUpdate();
await ps.close();
await stmt.close();
await conn.close();

// ── Later (page reload / new session) ──────────────────────────────────────

// Same URL, same key — database is restored from localStorage.
const conn2 = await ds.getConnection();
const stmt2 = await conn2.createStatement();
const rs = await stmt2.executeQuery('SELECT * FROM notes');
console.log(rs.getRows()); // [{ id: 1, text: 'Hello, persistent world!' }]
rs.close();
await stmt2.close();
await conn2.close();
```

## URL Scheme

```
jsdbc:sqljs:localstorage:<key>
```

`<key>` is the `localStorage` key under which the serialised database is stored. Use a unique key per logical database in your application.

## How it Works

1. **On connect** — if `localStorage[key]` exists, the database is restored from the stored binary. Otherwise a fresh in-memory database is created.
2. **On every write** (`executeUpdate`, `executePreparedUpdate`) — the sql.js database is serialised to Base64 via `db.export()` and written to `localStorage` immediately. No explicit save step required.
3. **On commit** — the final committed state is flushed.
4. **On rollback** — the pre-transaction `localStorage` snapshot is restored so the on-disk state rolls back along with the in-memory state.

## Transactions

Transactions work identically to the standard JSDBC interface. The snapshot-restore strategy ensures that a rolled-back transaction is invisible to future sessions:

```javascript
const conn = await ds.getConnection();
await conn.setAutoCommit(false);

const stmt = await conn.createStatement();
await stmt.executeUpdate("INSERT INTO notes VALUES (99, 'draft')");

await conn.rollback(); // rolls back both in-memory and localStorage state
await stmt.close();
await conn.close();

// A fresh connection will NOT see row 99.
```

## Injecting a Custom Storage Backend (Testing)

The driver accepts a `LocalStorageStore` instance via `properties.store`. Use this to inject a `Map`-backed shim in Node.js tests without a real browser:

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import { LocalStorageStore } from '@alt-javascript/jsdbc-sqljs-localstorage';
import '@alt-javascript/jsdbc-sqljs-localstorage';

class LocalStorageShim {
  constructor() { this._map = new Map(); }
  getItem(k)      { return this._map.has(k) ? this._map.get(k) : null; }
  setItem(k, v)   { this._map.set(k, v); }
  removeItem(k)   { this._map.delete(k); }
}

const ds = new DataSource({
  url: 'jsdbc:sqljs:localstorage:test-db',
  properties: { store: new LocalStorageStore(new LocalStorageShim()) },
});
```

## Storage Limits

`localStorage` typically supports **5 MB per origin**. The sql.js database is serialised as Base64, which adds ~33% overhead over the raw binary. For example, a 3 MB database occupies ~4 MB in localStorage.

If the stored value exceeds the quota, a descriptive error is thrown:

```
Error: localStorage quota exceeded for key "myapp-db" (~4800.0 KB).
       Consider running VACUUM to compact the database.
```

After a quota error the in-memory database remains usable — only the persistence write failed.

**To keep the database compact:** run `VACUUM` periodically to reclaim free pages left by deleted rows and dropped tables.

## Browser Compatibility

| Feature | Requirement |
|---|---|
| `localStorage` | All modern browsers |
| `sql.js` Wasm | Any browser with WebAssembly support |
| `btoa` / `atob` | All modern browsers |

## When to Use

- **Browser apps** needing persistent, queryable client-side storage
- **Offline-first apps** where data must survive page reloads without a server
- **Prototyping** a SQL-backed browser app without setting up a backend
- **Testing** complex SQL logic that runs identically in Node.js and the browser

## When NOT to Use

- **Large datasets** — if your data exceeds ~3 MB, consider IndexedDB or server-side storage
- **Multi-tab writes** — `localStorage` does not coordinate concurrent writes across tabs; the last writer wins
- **Node.js server apps** — use [`@alt-javascript/jsdbc-sqlite`](https://www.npmjs.com/package/@alt-javascript/jsdbc-sqlite) (better-sqlite3) instead

## License

MIT
