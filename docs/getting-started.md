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

await conn.close();
```

```bash
node demo.js
# Output: Inserted: 1 row
```

Use `Statement` for DDL (CREATE, DROP, ALTER). Use `PreparedStatement` for parameterised DML (INSERT, UPDATE, DELETE, SELECT) — it prevents SQL injection and supports parameter reuse.

## Step 3: Query Data

Add a query after the inserts:

```javascript
const query = await conn.prepareStatement('SELECT * FROM users WHERE name = ?');
query.setParameter(1, 'Alice');
const rs = await query.executeQuery();

// Cursor iteration (JDBC-style)
while (rs.next()) {
  console.log({
    id: rs.getObject('id'),
    name: rs.getObject('name'),
    email: rs.getObject('email'),
  });
}
rs.close();

// Or get all rows at once
const allQuery = await conn.prepareStatement('SELECT * FROM users ORDER BY id');
const allRs = await allQuery.executeQuery();
console.log('All users:', allRs.getRows());
allRs.close();
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
    return rows[0] || null;
  } finally {
    await conn.close();
  }
}
```

The `try`/`finally` pattern ensures connections are always closed, even on errors.

## What's Next

- [API Reference](api-reference.md) — complete documentation for every interface
- [Driver Guide](driver-guide.md) — write a custom JSDBC driver for your database
- [For JDBC Developers](jdbc-migration.md) — concept mapping from Java JDBC to JSDBC
