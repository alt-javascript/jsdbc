# How to Build a Persistent Browser App with JSDBC

This guide shows how to use `@alt-javascript/jsdbc-sqljs-localstorage` to build a browser application that stores SQL data in `localStorage` — so it survives page reloads and cross-session navigation without a server.

## When to Use This

Use this driver when:
- Your app needs queryable, relational data on the client side
- Data must survive page reloads and return visits
- You don't have a backend database or want to work offline-first
- Your dataset fits in `localStorage` (typically 5 MB per origin)

If your dataset is larger, or you need multi-tab writes, use [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) instead. This driver is not designed for those cases.

## Prerequisites

- A browser that supports WebAssembly and `localStorage` (all modern browsers)
- `@alt-javascript/jsdbc-core` and `@alt-javascript/jsdbc-sqljs-localstorage` installed

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-sqljs-localstorage
```

## Step 1: Initialise the DataSource

Create a `DataSource` with a `jsdbc:sqljs:localstorage:<key>` URL. The `<key>` is the `localStorage` key under which the database binary is stored. Choose a key that's unique to your application.

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqljs-localstorage';

const ds = new DataSource({ url: 'jsdbc:sqljs:localstorage:myapp-v1' });
```

Create the `DataSource` once when your application loads. You can create multiple `DataSource` instances with different keys if your app needs logically separate databases.

## Step 2: Create the Schema on First Run

Use `CREATE TABLE IF NOT EXISTS` so the DDL is safe to run on every page load — it's a no-op if the table already exists.

```javascript
async function initSchema(ds) {
  const conn = await ds.getConnection();
  try {
    const stmt = await conn.createStatement();
    await stmt.executeUpdate(`
      CREATE TABLE IF NOT EXISTS tasks (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        title   TEXT    NOT NULL,
        done    INTEGER NOT NULL DEFAULT 0,
        created TEXT    NOT NULL
      )
    `);
    await stmt.close();
  } finally {
    await conn.close();
  }
}

await initSchema(ds);
```

You should see: nothing — the operation is silent on success. Subsequent page loads skip schema creation because the table already exists in the stored database.

## Step 3: Write Data

Every `executeUpdate` call automatically flushes the database to `localStorage`. You don't need to call a save function.

```javascript
async function addTask(ds, title) {
  const conn = await ds.getConnection();
  try {
    const ps = await conn.prepareStatement(
      `INSERT INTO tasks (title, created) VALUES (?, ?)`,
    );
    ps.setParameter(1, title);
    ps.setParameter(2, new Date().toISOString());
    await ps.executeUpdate();
    await ps.close();
  } finally {
    await conn.close();
  }
}

await addTask(ds, 'Review pull request');
await addTask(ds, 'Update documentation');
```

## Step 4: Read Data

Queries work identically to any other JSDBC driver.

```javascript
async function listTasks(ds) {
  const conn = await ds.getConnection();
  try {
    const stmt = await conn.createStatement();
    const rs = await stmt.executeQuery(
      'SELECT id, title, done FROM tasks ORDER BY created',
    );
    const tasks = rs.getRows();
    rs.close();
    await stmt.close();
    return tasks;
  } finally {
    await conn.close();
  }
}

const tasks = await listTasks(ds);
console.log(tasks);
// [
//   { id: 1, title: 'Review pull request', done: 0 },
//   { id: 2, title: 'Update documentation', done: 0 }
// ]
```

## Step 5: Reload the Page and Verify Persistence

After completing steps 2–4, refresh the page and run `listTasks(ds)` again. You should get the same rows back — the database is restored from `localStorage` on the first `getConnection()` call.

You can verify what's stored:

```javascript
// Inspect the raw storage entry in the browser console
const raw = localStorage.getItem('myapp-v1');
console.log('Stored bytes (Base64):', raw?.length ?? 'not stored');
```

## Step 6: Transactions

Use transactions to group related writes atomically. If any step fails, `rollback()` restores both the in-memory database and the `localStorage` snapshot — so a partial failure leaves no trace in storage.

```javascript
async function completeTask(ds, id) {
  const conn = await ds.getConnection();
  await conn.setAutoCommit(false);
  try {
    const ps = await conn.prepareStatement(
      'UPDATE tasks SET done = 1 WHERE id = ?',
    );
    ps.setParameter(1, id);
    await ps.executeUpdate();
    await ps.close();

    // Could do other writes here atomically...

    await conn.commit(); // flushes to localStorage
  } catch (err) {
    await conn.rollback(); // restores pre-transaction localStorage snapshot
    throw err;
  } finally {
    await conn.close();
  }
}

await completeTask(ds, 1);
```

## Step 7: Handle Storage Quota Errors

`localStorage` is typically limited to 5 MB per origin. When the database exceeds that limit, `executeUpdate` throws:

```
Error: localStorage quota exceeded for key "myapp-v1" (~4800.0 KB).
       Consider running VACUUM to compact the database.
```

Catch this error and notify the user:

```javascript
try {
  await addTask(ds, 'Another task');
} catch (err) {
  if (err.message.includes('localStorage quota exceeded')) {
    alert('Storage is full. Please delete some data or run VACUUM.');
  } else {
    throw err;
  }
}
```

To reclaim space from deleted rows and dropped tables, run `VACUUM`:

```javascript
async function vacuum(ds) {
  const conn = await ds.getConnection();
  try {
    const stmt = await conn.createStatement();
    await stmt.executeUpdate('VACUUM');
    await stmt.close();
  } finally {
    await conn.close();
  }
}
```

## Testing Without a Browser

Inject a `LocalStorageStore` backed by a `Map` shim to test your database code in Node.js:

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

// Shared shim — same instance for both sessions, simulates localStorage
const shim = new MapShim();

const ds = new DataSource({
  url: 'jsdbc:sqljs:localstorage:test-db',
  properties: { store: new LocalStorageStore(shim) },
});
```

Use a fresh `MapShim` instance per test to start with an empty database, or share the same instance across two `DataSource` objects to test cross-session persistence.

## Troubleshooting

**Data is not persisting across page reloads.**
Confirm that `localStorage` is available and not blocked by browser settings (private browsing mode in some browsers disables `localStorage`). Check the browser console for errors from `localStorage.setItem`.

**`QuotaExceededError` on the first write.**
Your database is already large in `localStorage` from a prior session. Run `VACUUM` to compact it, or clear the key with `localStorage.removeItem('myapp-v1')` to start fresh.

**Transactions not behaving as expected.**
If a transaction is left open (no `commit()` or `rollback()`) when `conn.close()` is called, the connection rolls back and restores the pre-transaction `localStorage` snapshot. Always close connections in a `finally` block to avoid silent rollbacks.

**Multi-tab writes overwriting each other.**
`localStorage` has no write coordination across tabs. If two tabs write simultaneously, the last write wins and the other tab's changes are lost. For multi-tab scenarios, use the [Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) to coordinate, or use IndexedDB instead.

## What's Next

- [API Reference](api-reference.md#localstorage-store-alt-javascriptjsdbc-sqljs-localstorage) — `LocalStorageStore` API details
- [Package README](../packages/sqljs-localstorage/README.md) — storage internals, encoding, and size guidance
- [Getting Started](getting-started.md) — tutorial covering all JSDBC drivers
