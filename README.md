# JSDBC — JDBC-Inspired Database Access for JavaScript

A uniform, async database access facade for JavaScript inspired by Java's JDBC. Write database code once against JSDBC interfaces, then plug in any supported driver — SQLite, PostgreSQL, MySQL, MariaDB, SQL Server, Oracle, or browser-side SQLite via WebAssembly.

**Part of the [@alt-javascript](https://github.com/alt-javascript) ecosystem.**

## Why JSDBC?

JavaScript has no standard database access API. Every library — `pg`, `mysql2`, `better-sqlite3`, `sql.js`, `tedious`, `oracledb` — has its own incompatible interface. JSDBC provides:

- **One API across databases.** Switch from SQLite to PostgreSQL by changing a URL string
- **JDBC-style connection model.** Familiar to Java developers: `DriverManager` → `Connection` → `Statement` / `PreparedStatement` → `ResultSet`
- **All-async.** Every operation returns a `Promise` — idiomatic JavaScript with `async`/`await`
- **Connection pooling.** Built-in pool with zero dependencies, or plug in tarn.js / generic-pool
- **Driver auto-registration.** Import a driver package and it registers itself — no manual setup
- **Isomorphic SQL.** The `sql.js` driver runs the same SQL in Node.js and the browser via WebAssembly

## Packages

| Package | Description | Runtime |
|---|---|---|
| [`@alt-javascript/jsdbc-core`](packages/core/) | Interfaces: Driver, Connection, Statement, PreparedStatement, ResultSet, DataSource, DriverManager | Any |
| [`@alt-javascript/jsdbc-sqlite`](packages/sqlite/) | SQLite driver via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Node.js |
| [`@alt-javascript/jsdbc-pg`](packages/pg/) | PostgreSQL driver via [pg](https://github.com/brianc/node-postgres) | Node.js |
| [`@alt-javascript/jsdbc-mysql`](packages/mysql/) | MySQL/MariaDB driver via [mysql2](https://github.com/sidorares/node-mysql2) | Node.js |
| [`@alt-javascript/jsdbc-mssql`](packages/mssql/) | SQL Server driver via [tedious](https://github.com/tediousjs/tedious) | Node.js |
| [`@alt-javascript/jsdbc-oracle`](packages/oracle/) | Oracle driver via [oracledb](https://github.com/oracle/node-oracledb) (Thin mode) | Node.js |
| [`@alt-javascript/jsdbc-sqljs`](packages/sqljs/) | SQLite driver via [sql.js](https://github.com/sql-js/sql.js) (WebAssembly) | Node.js + Browser |

## Supported Databases

| Database | Package | Native Driver | Placeholder | Pure JS |
|---|---|---|---|---|
| SQLite | `jsdbc-sqlite` | better-sqlite3 | `?` (native) | ✗ (native addon) |
| SQLite (browser) | `jsdbc-sqljs` | sql.js (Wasm) | `?` (native) | ✓ |
| PostgreSQL | `jsdbc-pg` | pg | `?` → `$1, $2` | ✓ |
| MySQL / MariaDB | `jsdbc-mysql` | mysql2 | `?` (native) | ✓ |
| SQL Server | `jsdbc-mssql` | tedious | `?` → `@p0, @p1` | ✓ |
| Oracle | `jsdbc-oracle` | oracledb (Thin) | `?` → `:0, :1` | ✓ |

All drivers wrap battle-tested native libraries — JSDBC adds a uniform async API on top, not a new wire protocol implementation.

## Quick Start

Requires Node.js 18 or later.

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-sqlite
```

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqlite'; // self-registers with DriverManager

const ds = new DataSource({ url: 'jsdbc:sqlite:./myapp.db' });
const conn = await ds.getConnection();

// DDL via Statement
const stmt = await conn.createStatement();
await stmt.executeUpdate('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)');
await stmt.close();

// Parameterised INSERT via PreparedStatement
const ps = await conn.prepareStatement('INSERT INTO users (name) VALUES (?)');
ps.setParameter(1, 'Alice');
await ps.executeUpdate();
await ps.close();

// Parameterised SELECT
const query = await conn.prepareStatement('SELECT * FROM users WHERE name = ?');
query.setParameter(1, 'Alice');
const rs = await query.executeQuery();

while (rs.next()) {
  console.log(rs.getObject('id'), rs.getObject('name'));
}

rs.close();
await query.close();
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
const stmt = await conn.createStatement();
await stmt.executeUpdate('CREATE TABLE notes (id INTEGER PRIMARY KEY, text TEXT)');
await stmt.close();
```

Use `SingleConnectionDataSource` for in-memory databases where each `connect()` call would otherwise create a new empty database.

## Connection Pooling

```javascript
import { PooledDataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-pg';

const ds = new PooledDataSource({
  url: 'jsdbc:pg://localhost:5432/mydb',
  username: 'user',
  password: 'pass',
  pool: { min: 0, max: 10 },
});

const conn = await ds.getConnection(); // from pool
// ... use conn ...
await conn.close(); // returns to pool

await ds.destroy(); // at shutdown
```

Ships with a built-in `SimpleConnectionPool` (zero dependencies). For production, plug in [tarn.js](https://github.com/vincit/tarn.js) or [generic-pool](https://github.com/coopernurse/node-pool) via `TarnPoolAdapter` or `GenericPoolAdapter`. See [API Reference](docs/api-reference.md#connection-pooling).

## JSDBC URL Scheme

```
jsdbc:<subprotocol>:<connection-details>
```

| URL | Driver | Notes |
|---|---|---|
| `jsdbc:sqlite:./path/to/db.sqlite` | better-sqlite3 | File-based SQLite |
| `jsdbc:sqlite::memory:` | better-sqlite3 | In-memory SQLite |
| `jsdbc:sqljs:memory` | sql.js | In-memory SQLite (WebAssembly) |
| `jsdbc:pg://host:port/database` | pg | PostgreSQL |
| `jsdbc:mysql://host:port/database` | mysql2 | MySQL / MariaDB |
| `jsdbc:mssql://host:port/database` | tedious | SQL Server / Azure SQL |
| `jsdbc:oracle://host:port/service` | oracledb | Oracle Database (Thin mode) |

## Documentation

- [Getting Started](docs/getting-started.md) — tutorial: first database operations
- [API Reference](docs/api-reference.md) — complete interface documentation
- [Driver Guide](docs/driver-guide.md) — writing custom JSDBC drivers
- [For JDBC Developers](docs/jdbc-migration.md) — migrating from Java JDBC
- [Architecture Decisions](decisions/) — ADR register

## Contributing

```bash
git clone https://github.com/alt-javascript/jsdbc.git
cd jsdbc
npm install

npm test                # CI-safe: core + sqlite + sqljs (49 tests, no external deps)
npm run test:integration  # all drivers (94 tests, needs Docker for pg/mysql/mssql/oracle)
```

## License

MIT
