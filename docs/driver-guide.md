# Writing a JSDBC Driver

This guide explains how to implement a JSDBC driver for a new database. A driver is four classes: `Driver`, `Connection`, `Statement`, and `PreparedStatement`.

## Architecture

```
DriverManager
  └── Your Driver (registered on import)
        └── Your Connection
              ├── Your Statement
              └── Your PreparedStatement
```

JSDBC core provides abstract base classes. Your driver extends them and overrides the `_`-prefixed methods.

## Step 1: Implement the Driver

The `Driver` class declares which URLs it handles and creates connections.

```javascript
import { Driver, DriverManager } from '@alt-javascript/jsdbc-core';

class PostgresDriver extends Driver {
  acceptsURL(url) {
    return url.startsWith('jsdbc:pg:');
  }

  async connect(url, properties = {}) {
    // Parse URL: jsdbc:pg://host:port/database
    const connectionString = url.replace('jsdbc:pg:', '');
    // Create your native client connection here
    const nativeClient = await createNativeConnection(connectionString, properties);
    return new PostgresConnection(nativeClient);
  }
}

// Self-register — this runs when the package is imported
DriverManager.registerDriver(new PostgresDriver());
export default PostgresDriver;
```

## Step 2: Implement the Connection

Extend `Connection` and override the `_`-prefixed factory and transaction methods.

```javascript
import { Connection } from '@alt-javascript/jsdbc-core';

class PostgresConnection extends Connection {
  constructor(nativeClient) {
    super();
    this._client = nativeClient;
  }

  async _createStatement() {
    return new PostgresStatement(this);
  }

  async _prepareStatement(sql) {
    return new PostgresPreparedStatement(this, sql);
  }

  async _setAutoCommit(autoCommit) {
    if (!autoCommit) {
      await this._client.query('BEGIN');
    }
  }

  async _commit() {
    await this._client.query('COMMIT');
  }

  async _rollback() {
    await this._client.query('ROLLBACK');
  }

  async close() {
    await this._client.end();
    this._closed = true;
  }
}
```

**Required overrides:**

| Method | Purpose |
|---|---|
| `_createStatement()` | Return a new Statement bound to this connection |
| `_prepareStatement(sql)` | Return a new PreparedStatement for the given SQL |
| `_setAutoCommit(bool)` | Begin a transaction when set to `false` |
| `_commit()` | Commit the current transaction |
| `_rollback()` | Roll back the current transaction |
| `close()` | Close the native connection (call `this._closed = true`) |

## Step 3: Implement the Statement

Extend `Statement` and override `_executeQuery` and `_executeUpdate`.

```javascript
import { Statement, ResultSet } from '@alt-javascript/jsdbc-core';

class PostgresStatement extends Statement {
  async _executeQuery(sql) {
    const result = await this._connection._client.query(sql);
    const columns = result.fields.map(f => f.name);
    return new ResultSet(result.rows, columns);
  }

  async _executeUpdate(sql) {
    const result = await this._connection._client.query(sql);
    return result.rowCount ?? 0;
  }
}
```

**Key contract:**
- `_executeQuery(sql)` must return a `ResultSet` constructed with `new ResultSet(rows, columns)` where `rows` is an array of plain objects and `columns` is an array of column name strings.
- `_executeUpdate(sql)` must return a number (affected row count). Return `0` for DDL statements.

## Step 4: Implement the PreparedStatement

Extend `PreparedStatement` and override `_executePreparedQuery` and `_executePreparedUpdate`.

```javascript
import { PreparedStatement, ResultSet } from '@alt-javascript/jsdbc-core';

class PostgresPreparedStatement extends PreparedStatement {
  async _executePreparedQuery(sql, params) {
    // Convert ? placeholders to $1, $2 for pg
    let idx = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
    const result = await this._connection._client.query(pgSql, params);
    const columns = result.fields.map(f => f.name);
    return new ResultSet(result.rows, columns);
  }

  async _executePreparedUpdate(sql, params) {
    let idx = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
    const result = await this._connection._client.query(pgSql, params);
    return result.rowCount ?? 0;
  }
}
```

**Parameters arrive as an ordered array** — the base class converts the 1-based `setParameter()` calls into `params[0], params[1], ...`. Your implementation adapts the placeholder syntax to your native driver's convention.

## Step 5: Export and Self-Register

Create `index.js`:

```javascript
import PostgresDriver from './PostgresDriver.js';
export { default as PostgresDriver } from './PostgresDriver.js';
export { default as PostgresConnection } from './PostgresConnection.js';
export { default as PostgresStatement } from './PostgresStatement.js';
export { default as PostgresPreparedStatement } from './PostgresPreparedStatement.js';
```

The import of `PostgresDriver.js` triggers `DriverManager.registerDriver()`. Users just write:

```javascript
import '@alt-javascript/jsdbc-pg'; // registers the driver
```

## Testing Your Driver

Use the shared compliance test suite from `@alt-javascript/jsdbc-core`:

```javascript
// test/PostgresDriver.spec.js
import driverComplianceTests from '@alt-javascript/jsdbc-core/test/driverCompliance.js';
import { DataSource } from '@alt-javascript/jsdbc-core';
import '../index.js';

driverComplianceTests('PostgreSQL (pg)', () => {
  return new DataSource({
    url: 'jsdbc:pg://localhost:5432/testdb',
    username: 'postgres',
    password: 'secret',
  });
});
```

The compliance suite tests all 15 standard driver behaviours: connection lifecycle, DDL/DML via Statement, parameterised queries, NULL handling, ResultSet iteration, transactions, and DriverManager integration.

### Dialect Options

Databases differ in SQL syntax. The compliance suite accepts an optional third argument with dialect options:

```javascript
driverComplianceTests('My Driver', getDataSource, {
  limitOne: 'FETCH FIRST 1 ROWS ONLY', // default: 'LIMIT 1'
  realType: 'NUMBER(10,2)',             // default: 'REAL'
  textType: 'NVARCHAR(255)',            // default: 'TEXT'
  ifNotExists: false,                   // default: true (CREATE TABLE IF NOT EXISTS)
  dropSyntax: 'oracle',                // default: 'mssql' — used when ifNotExists is false
});
```

| Option | Default | When to change |
|---|---|---|
| `limitOne` | `'LIMIT 1'` | Oracle: `'FETCH FIRST 1 ROWS ONLY'`, MSSQL: `'OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY'` |
| `realType` | `'REAL'` | Oracle: `'NUMBER(10,2)'` |
| `textType` | `'TEXT'` | MSSQL: `'NVARCHAR(255)'`, Oracle: `'VARCHAR2(255)'` |
| `ifNotExists` | `true` | Set to `false` for MSSQL and Oracle (no `CREATE TABLE IF NOT EXISTS`) |
| `dropSyntax` | `'mssql'` | Set to `'oracle'` for Oracle PL/SQL drop syntax |

## Package Conventions

- Package name: `@alt-javascript/jsdbc-<subprotocol>` (e.g. `jsdbc-pg`, `jsdbc-mysql`)
- URL scheme: `jsdbc:<subprotocol>:` (e.g. `jsdbc:pg:`, `jsdbc:mysql:`)
- Self-register on import — no manual driver setup required
- Wrap an existing battle-tested native driver — don't implement the wire protocol yourself

## Placeholder Conversion Reference

JSDBC uses `?` as the universal placeholder. Each driver converts to its native syntax:

| Database | Native Syntax | Conversion |
|---|---|---|
| SQLite (better-sqlite3) | `?` | None needed |
| sql.js | `?` | None needed |
| MySQL / MariaDB (mysql2) | `?` | None needed |
| PostgreSQL (pg) | `$1`, `$2`, ... | `sql.replace(/\?/g, () => '$' + (++idx))` |
| SQL Server (tedious) | `@p0`, `@p1`, ... | `sql.replace(/\?/g, () => '@p' + (idx++))` |
| Oracle (oracledb) | `:0`, `:1`, ... | `sql.replace(/\?/g, () => ':' + (idx++))` |

Extract the conversion into a reusable `convertPlaceholders` function in your PreparedStatement.

## Transaction Implementations

Some native drivers have their own transaction API rather than accepting `BEGIN`/`COMMIT`/`ROLLBACK` as SQL strings.

| Database | Transaction Approach |
|---|---|
| PostgreSQL, MySQL, SQLite | `BEGIN` / `COMMIT` / `ROLLBACK` via `executeUpdate` |
| SQL Server (tedious) | `beginTransaction()` / `commitTransaction()` / `rollbackTransaction()` callbacks |
| Oracle (oracledb) | Implicit transaction start; `conn.commit()` / `conn.rollback()` methods |

Check your native driver's documentation — using its native transaction API avoids subtle state tracking bugs.
