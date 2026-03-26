# API Reference

Complete interface documentation for `@alt-javascript/jsdbc-core`.

## DriverManager

Static registry for JSDBC drivers. Drivers register themselves on import.

```javascript
import { DriverManager } from '@alt-javascript/jsdbc-core';
```

| Method | Returns | Description |
|---|---|---|
| `DriverManager.registerDriver(driver)` | `void` | Register a Driver instance |
| `DriverManager.deregisterDriver(driver)` | `void` | Remove a registered driver |
| `DriverManager.getConnection(url, properties?)` | `Promise<Connection>` | Get a connection from the first driver that accepts the URL |
| `DriverManager.getDrivers()` | `Driver[]` | List all registered drivers |
| `DriverManager.clear()` | `void` | Remove all registered drivers (testing) |

## Driver

Abstract base class. Implement to support a new database.

```javascript
import { Driver } from '@alt-javascript/jsdbc-core';
```

| Method | Returns | Description |
|---|---|---|
| `acceptsURL(url)` | `boolean` | Whether this driver handles the given JSDBC URL |
| `connect(url, properties?)` | `Promise<Connection>` | Create a connection to the database |

## DataSource

Connection factory. Create once at application startup, call `getConnection()` for each unit of work.

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';

const ds = new DataSource({
  url: 'jsdbc:sqlite:./myapp.db',
  username: 'user',     // optional
  password: 'pass',     // optional
  properties: { ... },  // optional, driver-specific
});
```

| Method | Returns | Description |
|---|---|---|
| `getConnection()` | `Promise<Connection>` | Get a connection via DriverManager |
| `getUrl()` | `string` | The configured JSDBC URL |

### SingleConnectionDataSource

Extends `DataSource`. Returns the same connection on every `getConnection()` call, with `close()` as a no-op. Use for in-memory databases where each `connect()` would create a new empty database.

```javascript
import { SingleConnectionDataSource } from '@alt-javascript/jsdbc-core';

const ds = new SingleConnectionDataSource({ url: 'jsdbc:sqljs:memory' });
const conn = await ds.getConnection();
// conn.close() is a no-op — the connection stays alive
```

| Method | Returns | Description |
|---|---|---|
| `getConnection()` | `Promise<Connection>` | The shared connection (created on first call) |
| `destroy()` | `Promise<void>` | Actually close the underlying connection |

## Connection

A session to a database. Obtained from `DataSource.getConnection()` or `DriverManager.getConnection()`.

```javascript
const conn = await dataSource.getConnection();
```

| Method | Returns | Description |
|---|---|---|
| `createStatement()` | `Promise<Statement>` | Create a Statement for ad-hoc SQL |
| `prepareStatement(sql)` | `Promise<PreparedStatement>` | Create a PreparedStatement with `?` placeholders |
| `setAutoCommit(autoCommit)` | `Promise<void>` | Set auto-commit mode. `false` starts a transaction. |
| `getAutoCommit()` | `boolean` | Current auto-commit state |
| `commit()` | `Promise<void>` | Commit the current transaction |
| `rollback()` | `Promise<void>` | Roll back the current transaction |
| `close()` | `Promise<void>` | Close the connection and release resources |
| `isClosed()` | `boolean` | Whether the connection has been closed |

## Statement

Executes ad-hoc SQL (no parameters). Best for DDL.

```javascript
const stmt = await conn.createStatement();
await stmt.executeUpdate('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
await stmt.close();
```

| Method | Returns | Description |
|---|---|---|
| `executeQuery(sql)` | `Promise<ResultSet>` | Execute a SELECT; returns a ResultSet |
| `executeUpdate(sql)` | `Promise<number>` | Execute INSERT/UPDATE/DELETE/DDL; returns affected row count |
| `execute(sql)` | `Promise<boolean>` | Execute any SQL; returns `true` if result is a ResultSet |
| `close()` | `Promise<void>` | Close the statement |
| `isClosed()` | `boolean` | Whether the statement has been closed |

## PreparedStatement

Parameterised SQL execution. Extends `Statement`. Use for all DML to prevent SQL injection.

```javascript
const ps = await conn.prepareStatement('SELECT * FROM users WHERE id = ?');
ps.setParameter(1, 42);
const rs = await ps.executeQuery();
// ... use rs ...
rs.close();
await ps.close();
```

| Method | Returns | Description |
|---|---|---|
| `setParameter(index, value)` | `void` | Set parameter at 1-based index |
| `setString(index, value)` | `void` | Alias for `setParameter` |
| `setInt(index, value)` | `void` | Alias for `setParameter` |
| `setFloat(index, value)` | `void` | Alias for `setParameter` |
| `setNull(index)` | `void` | Set parameter to `null` |
| `clearParameters()` | `void` | Clear all parameter values |
| `executeQuery()` | `Promise<ResultSet>` | Execute parameterised SELECT |
| `executeUpdate()` | `Promise<number>` | Execute parameterised INSERT/UPDATE/DELETE |
| `close()` | `Promise<void>` | Close the statement |

> **Note:** Unlike `Statement`, `executeQuery()` and `executeUpdate()` take no arguments — the SQL was provided in `prepareStatement()`.

## ResultSet

Query results with cursor-based and bulk access.

```javascript
const rs = await ps.executeQuery();

// Cursor iteration
while (rs.next()) {
  const name = rs.getObject('name');
  const id = rs.getInt(1);          // 1-based column index
}

// Or bulk access
const rows = rs.getRows();           // [{id: 1, name: 'Alice'}, ...]
const columns = rs.getColumnNames(); // ['id', 'name']

rs.close();
```

| Method | Returns | Description |
|---|---|---|
| `next()` | `boolean` | Advance cursor to next row; returns `false` when exhausted |
| `getObject(nameOrIndex)` | `*` | Get column value by name or 1-based index |
| `getString(nameOrIndex)` | `string\|null` | Get column value as string |
| `getInt(nameOrIndex)` | `number\|null` | Get column value as number |
| `getRow()` | `Object` | Get current row as a plain object (copy) |
| `getRows()` | `Object[]` | Get all rows as plain objects (copies). No cursor needed. |
| `getColumnNames()` | `string[]` | Column names in order |
| `getRowCount()` | `number` | Total number of rows |
| `close()` | `void` | Close the ResultSet |
| `isClosed()` | `boolean` | Whether the ResultSet has been closed |

> **Cursor position:** The cursor starts before the first row. Call `next()` before calling `getObject()`. Calling `getObject()` without a valid cursor throws an error.

## URL Scheme

```
jsdbc:<subprotocol>:<connection-details>
```

| URL Pattern | Driver Package | Description |
|---|---|---|
| `jsdbc:sqlite:<path>` | `@alt-javascript/jsdbc-sqlite` | File-based SQLite via better-sqlite3 |
| `jsdbc:sqlite::memory:` | `@alt-javascript/jsdbc-sqlite` | In-memory SQLite via better-sqlite3 |
| `jsdbc:sqljs:memory` | `@alt-javascript/jsdbc-sqljs` | In-memory SQLite via sql.js (WebAssembly) |
| `jsdbc:sqljs:localstorage:<key>` | `@alt-javascript/jsdbc-sqljs-localstorage` | Persistent browser SQLite via sql.js + localStorage |
| `jsdbc:pg://<host>:<port>/<db>` | `@alt-javascript/jsdbc-pg` | PostgreSQL via pg |
| `jsdbc:mysql://<host>:<port>/<db>` | `@alt-javascript/jsdbc-mysql` | MySQL/MariaDB via mysql2 |
| `jsdbc:mssql://<host>:<port>/<db>` | `@alt-javascript/jsdbc-mssql` | SQL Server via tedious |
| `jsdbc:oracle://<host>:<port>/<svc>` | `@alt-javascript/jsdbc-oracle` | Oracle via oracledb (Thin mode) |

## Connection Pooling

### PooledDataSource

Drop-in replacement for `DataSource` that manages a connection pool. `close()` on a pooled connection returns it to the pool instead of closing it.

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
await conn.close(); // returns to pool (not closed)

// At shutdown:
await ds.destroy(); // closes all connections
```

| Method | Returns | Description |
|---|---|---|
| `getConnection()` | `Promise<Connection>` | Acquire a pooled connection (close() returns it to pool) |
| `destroy()` | `Promise<void>` | Close all connections and destroy the pool |
| `getPool()` | `ConnectionPool` | Access the underlying pool for stats |

### Pool Options

Passed as `pool` in the PooledDataSource config. These apply to the built-in `SimpleConnectionPool`.

| Option | Default | Description |
|---|---|---|
| `min` | `0` | Minimum idle connections to keep alive |
| `max` | `10` | Maximum concurrent connections |
| `acquireTimeoutMillis` | `30000` | Reject acquire after this timeout |
| `idleTimeoutMillis` | `30000` | Destroy connections idle longer than this |
| `reapIntervalMillis` | `1000` | How often to check for idle connections |

### ConnectionPool Interface

Abstract base class for pool implementations. Implement `acquire()`, `release()`, `destroy()`.

| Method/Property | Returns | Description |
|---|---|---|
| `acquire()` | `Promise<Connection>` | Get a connection from the pool |
| `release(connection)` | `Promise<void>` | Return a connection to the pool |
| `destroy()` | `Promise<void>` | Destroy the pool and all connections |
| `numUsed` | `number` | Connections currently in use |
| `numFree` | `number` | Idle connections available |
| `numPending` | `number` | Pending acquire requests |

### Pluggable Pool Implementations

#### Built-in SimpleConnectionPool (default)

Zero dependencies. Used automatically by `PooledDataSource` when no `connectionPool` is provided.

#### tarn.js Adapter

```javascript
import { Pool } from 'tarn';
import { PooledDataSource, TarnPoolAdapter } from '@alt-javascript/jsdbc-core';

const pool = TarnPoolAdapter.create(Pool, {
  create: () => DriverManager.getConnection(url, props),
  destroy: (conn) => conn.close(),
  validate: (conn) => !conn.isClosed(),
  min: 0,
  max: 10,
});

const ds = new PooledDataSource({ url, connectionPool: pool });
```

#### generic-pool Adapter

```javascript
import genericPool from 'generic-pool';
import { PooledDataSource, GenericPoolAdapter } from '@alt-javascript/jsdbc-core';

const pool = GenericPoolAdapter.create(genericPool, {
  create: () => DriverManager.getConnection(url, props),
  destroy: (conn) => conn.close(),
  validate: (conn) => !conn.isClosed(),
  min: 0,
  max: 10,
});

const ds = new PooledDataSource({ url, connectionPool: pool });
```

## LocalStorageStore (`@alt-javascript/jsdbc-sqljs-localstorage`)

Injectable abstraction over the `localStorage` API. Wraps any backend implementing `{ getItem, setItem, removeItem }`. Used by `LocalStorageSqlJsDriver` to persist and restore the sql.js database binary.

```javascript
import { LocalStorageStore } from '@alt-javascript/jsdbc-sqljs-localstorage';
```

### Constructor

```javascript
new LocalStorageStore(backend?)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `backend` | `{ getItem, setItem, removeItem }` | `globalThis.localStorage` | Storage backend. Defaults to browser localStorage. |

### Methods

| Method | Returns | Description |
|---|---|---|
| `getItem(key)` | `string\|null` | Retrieve stored value by key |
| `setItem(key, value)` | `void` | Store value. May throw `QuotaExceededError` if storage is full. |
| `removeItem(key)` | `void` | Delete stored key |

### Injecting a Test Backend

Pass a `Map`-backed shim to test localStorage-backed code in Node.js without a browser:

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import { LocalStorageStore } from '@alt-javascript/jsdbc-sqljs-localstorage';
import '@alt-javascript/jsdbc-sqljs-localstorage';

class MapShim {
  constructor() { this._map = new Map(); }
  getItem(k)    { return this._map.has(k) ? this._map.get(k) : null; }
  setItem(k, v) { this._map.set(k, v); }
  removeItem(k) { this._map.delete(k); }
}

const ds = new DataSource({
  url: 'jsdbc:sqljs:localstorage:test-db',
  properties: { store: new LocalStorageStore(new MapShim()) },
});
```

### QuotaExceededError

When `setItem` throws a `QuotaExceededError`, the driver rethrows it as a descriptive `Error`:

```
Error: localStorage quota exceeded for key "myapp-db" (~4800.0 KB).
       Consider running VACUUM to compact the database.
```

The in-memory sql.js database remains usable after a quota error — only the persistence write failed.
