# Getting Started

This tutorial walks you through your first JSDBC database operations. By the end, you'll have created a table, inserted data, queried it with parameters, and run a transaction.

## Prerequisites

- Node.js 18 or later
- npm

## Install

```bash
mkdir jsdbc-demo && cd jsdbc-demo
npm init -y
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-sqlite
```

Add `"type": "module"` to your `package.json`.

## Step 1: Connect to a Database

Create `demo.js`:

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqlite';

const ds = new DataSource({ url: 'jsdbc:sqlite::memory:' });
const conn = await ds.getConnection();

console.log('Connected:', !conn.isClosed());
await conn.close();
```

```bash
node demo.js
# Output: Connected: true
```

Importing `@alt-javascript/jsdbc-sqlite` registers the SQLite driver with `DriverManager`. The `DataSource` uses `DriverManager` internally to match the URL `jsdbc:sqlite:` to the correct driver.

## Step 2: Create a Table and Insert Data

Replace `demo.js`:

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqlite';

const ds = new DataSource({ url: 'jsdbc:sqlite::memory:' });
const conn = await ds.getConnection();

// DDL via Statement
const stmt = await conn.createStatement();
await stmt.executeUpdate(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`);

// DML via PreparedStatement
const ps = await conn.prepareStatement('INSERT INTO users (name, email) VALUES (?, ?)');

ps.setParameter(1, 'Alice');
ps.setParameter(2, 'alice@example.com');
const count = await ps.executeUpdate();
console.log('Inserted:', count, 'row');

ps.clearParameters();
ps.setParameter(1, 'Bob');
ps.setParameter(2, 'bob@example.com');
await ps.executeUpdate();
await ps.close();

await conn.close();
```

```bash
node demo.js
# Output: Inserted: 1 row
```

Use `Statement` for DDL (CREATE, DROP, ALTER). Use `PreparedStatement` for parameterised DML (INSERT, UPDATE, DELETE, SELECT) — it prevents SQL injection and supports parameter reuse.

## Step 3: Query Data

Add the following after the inserts in `demo.js` (before `await conn.close()`):

```javascript
// Cursor iteration (JDBC-style)
const query = await conn.prepareStatement('SELECT * FROM users WHERE name = ?');
query.setParameter(1, 'Alice');
const rs = await query.executeQuery();

while (rs.next()) {
  console.log({
    id: rs.getObject('id'),
    name: rs.getObject('name'),
    email: rs.getObject('email'),
  });
}
rs.close();
await query.close();

// Or get all rows at once
const allQuery = await conn.prepareStatement('SELECT * FROM users ORDER BY id');
const allRs = await allQuery.executeQuery();
console.log('All users:', allRs.getRows());
allRs.close();
await allQuery.close();
```

```bash
node demo.js
# Output:
# { id: 1, name: 'Alice', email: 'alice@example.com' }
# All users: [ { id: 1, name: 'Alice', ... }, { id: 2, name: 'Bob', ... } ]
```

`ResultSet` supports two access patterns:
- **Cursor iteration** — call `next()` then `getObject()`, `getString()`, `getInt()`. Familiar to JDBC developers.
- **Bulk access** — call `getRows()` to get all rows as plain objects. More idiomatic in JavaScript.

## Step 4: Transactions

```javascript
const conn = await ds.getConnection();
await conn.setAutoCommit(false);

try {
  const ps = await conn.prepareStatement('INSERT INTO users (name, email) VALUES (?, ?)');

  ps.setParameter(1, 'Carol');
  ps.setParameter(2, 'carol@example.com');
  await ps.executeUpdate();

  ps.clearParameters();
  ps.setParameter(1, 'Dave');
  ps.setParameter(2, 'dave@example.com');
  await ps.executeUpdate();
  await ps.close();

  await conn.commit();
  console.log('Transaction committed');
} catch (err) {
  await conn.rollback();
  console.error('Transaction rolled back:', err.message);
} finally {
  await conn.close();
}
```

Call `setAutoCommit(false)` to begin a transaction. The transaction spans all operations until `commit()` or `rollback()` is called. This is the same model as JDBC.

## Step 5: Use DataSource for Connection Management

In real applications, create a `DataSource` once and reuse it:

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqlite';

// Create once at application startup
const dataSource = new DataSource({ url: 'jsdbc:sqlite:./app.db' });

// Use in your service layer
async function findUserByEmail(email) {
  const conn = await dataSource.getConnection();
  try {
    const ps = await conn.prepareStatement('SELECT * FROM users WHERE email = ?');
    ps.setParameter(1, email);
    const rs = await ps.executeQuery();
    const rows = rs.getRows();
    rs.close();
    await ps.close();
    return rows[0] || null;
  } finally {
    await conn.close();
  }
}
```

The `try`/`finally` pattern ensures connections are always closed, even on errors.

## Step 6: Connection Pooling

For applications that handle multiple concurrent requests, use `PooledDataSource` instead of `DataSource`. Pooled connections are reused rather than created and destroyed per request.

```javascript
import { PooledDataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqlite';

const ds = new PooledDataSource({
  url: 'jsdbc:sqlite:./app.db',
  pool: { min: 0, max: 10 },
});

async function findUser(id) {
  const conn = await ds.getConnection(); // acquired from pool
  try {
    const ps = await conn.prepareStatement('SELECT * FROM users WHERE id = ?');
    ps.setParameter(1, id);
    const rs = await ps.executeQuery();
    const rows = rs.getRows();
    rs.close();
    await ps.close();
    return rows[0] || null;
  } finally {
    await conn.close(); // returned to pool, not closed
  }
}

// At application shutdown:
await ds.destroy(); // closes all pooled connections
```

`PooledDataSource` ships with a built-in pool that requires no external dependencies. For production workloads, you can plug in [tarn.js](https://github.com/vincit/tarn.js) or [generic-pool](https://github.com/coopernurse/node-pool) via `TarnPoolAdapter` or `GenericPoolAdapter`. See the [API Reference](api-reference.md#connection-pooling) for details.

## What's Next

- [API Reference](api-reference.md) — complete documentation for every interface
- [Driver Guide](driver-guide.md) — write a custom JSDBC driver for your database
- [For JDBC Developers](jdbc-migration.md) — concept mapping from Java JDBC to JSDBC

## Using a Different Database

JSDBC drivers are interchangeable — swap the import and URL, and the same code works:

### PostgreSQL

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-pg
```

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-pg';

const ds = new DataSource({
  url: 'jsdbc:pg://localhost:5432/mydb',
  username: 'postgres',
  password: 'secret',
});
```

### MySQL / MariaDB

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-mysql
```

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-mysql';

const ds = new DataSource({
  url: 'jsdbc:mysql://localhost:3306/mydb',
  username: 'root',
  password: 'secret',
});
```

### SQL Server

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-mssql
```

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-mssql';

const ds = new DataSource({
  url: 'jsdbc:mssql://localhost:1433/mydb',
  username: 'sa',
  password: 'MyPassword1!',
});
```

### Oracle

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-oracle
```

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-oracle';

const ds = new DataSource({
  url: 'jsdbc:oracle://localhost:1521/FREEPDB1',
  username: 'appuser',
  password: 'secret',
});
```

### Teradata

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-teradata
```

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-teradata';

const ds = new DataSource({
  url: 'jsdbc:teradata://my-teradata-host/mydb',
  username: 'appuser',
  password: 'secret',
});
```

### Browser — In-Memory (sql.js / WebAssembly)

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-sqljs
```

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqljs';

const ds = new DataSource({ url: 'jsdbc:sqljs:memory' });
```

### Browser — Persistent (sql.js + localStorage)

For browser apps where data must survive page reloads, use the `jsdbc-sqljs-localstorage` driver. It automatically serialises the database to `localStorage` after every write — no explicit save step required.

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-sqljs-localstorage
```

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqljs-localstorage';

// 'myapp-db' is the localStorage key where the database binary is stored.
const ds = new DataSource({ url: 'jsdbc:sqljs:localstorage:myapp-db' });

// First visit — create schema and insert data.
const conn = await ds.getConnection();
const stmt = await conn.createStatement();
await stmt.executeUpdate('CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, text TEXT)');
await stmt.close();

const ps = await conn.prepareStatement('INSERT INTO notes (text) VALUES (?)');
ps.setParameter(1, 'Remember to call the client');
await ps.executeUpdate();
await ps.close();
await conn.close();

// Later — page reload, new session, same URL.
// The database is restored automatically from localStorage.
const conn2 = await ds.getConnection();
const stmt2 = await conn2.createStatement();
const rs = await stmt2.executeQuery('SELECT * FROM notes');
console.log(rs.getRows()); // [{ id: 1, text: 'Remember to call the client' }]
rs.close();
await stmt2.close();
await conn2.close();
```

See the [Browser Persistence how-to guide](browser-persistence.md) for full details, transaction handling, storage limits, and testing patterns.

All drivers use the same `DataSource`, `Connection`, `Statement`, `PreparedStatement`, and `ResultSet` API. Your application code doesn't change — only the import and URL.
