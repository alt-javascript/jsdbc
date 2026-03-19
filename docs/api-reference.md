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
| `jsdbc:pg://<host>:<port>/<db>` | `@alt-javascript/jsdbc-pg` | PostgreSQL via pg |
