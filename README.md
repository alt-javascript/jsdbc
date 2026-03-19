# JSDBC — JDBC-Inspired Database Access for JavaScript

A uniform, async database access facade for JavaScript inspired by Java's JDBC and Spring's `JdbcTemplate`. Write database code once against JSDBC interfaces, then plug in any supported driver — SQLite (Node.js or browser), PostgreSQL, MySQL, SQL Server.

**Part of the [@alt-javascript](https://github.com/alt-javascript) ecosystem.**

## Why JSDBC?

JavaScript has no standard database access API. Every library — `pg`, `mysql2`, `better-sqlite3`, `sql.js` — has its own incompatible interface. JSDBC provides:

- **One API across databases.** Switch from SQLite to PostgreSQL by changing a URL string.
- **JDBC-style connection model.** Familiar to Java developers: `DriverManager` → `Connection` → `Statement` / `PreparedStatement` → `ResultSet`.
- **All-async.** Every operation returns a `Promise`. Idiomatic JavaScript, works with `async`/`await`.
- **Driver auto-registration.** Import a driver package and it registers itself — no manual setup.
- **Isomorphic SQL.** The `sql.js` driver runs the same SQL in Node.js and the browser via WebAssembly.

## Packages

| Package | Description | Runtime |
|---|---|---|
| [`@alt-javascript/jsdbc-core`](packages/core/) | Interfaces: Driver, Connection, Statement, PreparedStatement, ResultSet, DataSource, DriverManager | Any |
| [`@alt-javascript/jsdbc-sqlite`](packages/sqlite/) | SQLite driver via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Node.js |
| [`@alt-javascript/jsdbc-sqljs`](packages/sqljs/) | SQLite driver via [sql.js](https://github.com/sql-js/sql.js) (WebAssembly) | Node.js + Browser |

> **Template layer** (`JsdbcTemplate`, `NamedParameterJsdbcTemplate`) is available separately in the `@alt-javascript/boot` monorepo, alongside CDI and configuration — where data access templates naturally integrate with dependency injection and connection lifecycle management.

## Quick Start

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-sqlite
```

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqlite'; // self-registers with DriverManager

const ds = new DataSource({ url: 'jsdbc:sqlite:./myapp.db' });
const conn = await ds.getConnection();

const stmt = await conn.createStatement();
await stmt.executeUpdate('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)');

const ps = await conn.prepareStatement('INSERT INTO users (name) VALUES (?)');
ps.setParameter(1, 'Alice');
await ps.executeUpdate();

const ps2 = await conn.prepareStatement('SELECT * FROM users WHERE name = ?');
ps2.setParameter(1, 'Alice');
const rs = await ps2.executeQuery();

while (rs.next()) {
  console.log(rs.getObject('id'), rs.getObject('name'));
}

rs.close();
await conn.close();
```

## Browser Usage

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-sqljs
```

```javascript
import { SingleConnectionDataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqljs';

const ds = new SingleConnectionDataSource({ url: 'jsdbc:sqljs:memory' });
const conn = await ds.getConnection();

// Same API as Node.js — SQL runs in-browser via WebAssembly
await conn.createStatement()
  .then(s => s.executeUpdate('CREATE TABLE notes (id INTEGER PRIMARY KEY, text TEXT)'));
```

Use `SingleConnectionDataSource` for in-memory databases where each `connect()` call would otherwise create a new empty database.

## JSDBC URL Scheme

```
jsdbc:<subprotocol>:<connection-details>
```

| URL | Driver | Notes |
|---|---|---|
| `jsdbc:sqlite:./path/to/db.sqlite` | better-sqlite3 | File-based SQLite |
| `jsdbc:sqlite::memory:` | better-sqlite3 | In-memory SQLite |
| `jsdbc:sqljs:memory` | sql.js | In-memory SQLite (WebAssembly) |

## Documentation

- [Getting Started](docs/getting-started.md) — tutorial: first database operations
- [API Reference](docs/api-reference.md) — complete interface documentation
- [Driver Guide](docs/driver-guide.md) — writing custom JSDBC drivers
- [For JDBC Developers](docs/jdbc-migration.md) — migrating from Java JDBC / Spring JdbcTemplate
- [Architecture Decisions](decisions/) — ADR register

## Contributing

```bash
git clone https://github.com/alt-javascript/jsdbc.git
cd jsdbc
npm install
npm test  # runs all workspace tests
```

## License

MIT
