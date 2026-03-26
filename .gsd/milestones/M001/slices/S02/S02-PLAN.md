# M001 · S02 — Driver, Connection, Statement + full compliance suite

**Milestone:** M001 — jsdbc-sqljs-localstorage  
**Risk:** Medium  
**Depends on:** S01  
**Proof level:** Integration

## Goal

Implement `LocalStorageSqlJsDriver`, `LocalStorageSqlJsConnection`, and thin Statement/PreparedStatement subclasses. Pass the full driver compliance test suite (`driverCompliance.js`) plus a cross-session persistence test and transaction rollback-restore test, all using the Map shim.

## Success Criteria

- All 14 `driverCompliance` test cases pass
- Cross-session test passes (write → new connection → SELECT)
- Transaction rollback test passes (BEGIN → INSERT → ROLLBACK → new connection → 0 rows)
- `npm test -w packages/sqljs-localstorage` exits 0

## Integration Closure

Driver self-registers; `jsdbc:sqljs:localstorage:<key>` URLs resolve via DriverManager. Existing `jsdbc:sqljs:memory` tests are unaffected (run sibling package to confirm).

## After this

`npm test -w packages/sqljs-localstorage` prints green for all compliance, persistence, and rollback tests.

---

## Tasks

### T01 · Implement LocalStorageSqlJsConnection

**Estimate:** 60 min  
**Files:** `packages/sqljs-localstorage/LocalStorageSqlJsConnection.js`

**Steps:**
1. Extend `SqlJsConnection` from `@alt-javascript/jsdbc-sqljs`:
   ```js
   import SqlJsConnection from '@alt-javascript/jsdbc-sqljs/SqlJsConnection.js';
   import LocalStorageStore from './LocalStorageStore.js';

   export default class LocalStorageSqlJsConnection extends SqlJsConnection {
     constructor(db, storageKey, store) {
       super(db);
       this._storageKey = storageKey;
       this._store = store;          // LocalStorageStore instance
       this._snapshot = null;        // pre-transaction localStorage value
     }

     /** Serialise db to Base64 and persist. */
     _flush() {
       const data = this._db.export();                  // Uint8Array
       const b64 = btoa(String.fromCharCode(...data));
       try {
         this._store.setItem(this._storageKey, b64);
       } catch (e) {
         if (e.name === 'QuotaExceededError') {
           throw new Error(`localStorage quota exceeded for key "${this._storageKey}"`);
         }
         throw e;
       }
     }

     async _setAutoCommit(autoCommit) {
       if (!autoCommit && !this._inTransaction) {
         // Snapshot current localStorage value before BEGIN
         this._snapshot = this._store.getItem(this._storageKey);
         this._db.run('BEGIN');
         this._inTransaction = true;
       }
     }

     async _commit() {
       if (this._inTransaction) {
         this._db.run('COMMIT');
         this._inTransaction = false;
         this._snapshot = null;
         this._flush();               // persist committed state
       }
     }

     async _rollback() {
       if (this._inTransaction) {
         this._db.run('ROLLBACK');
         this._inTransaction = false;
         // Restore pre-transaction localStorage value
         if (this._snapshot !== null) {
           this._store.setItem(this._storageKey, this._snapshot);
         } else {
           this._store.removeItem(this._storageKey);
         }
         this._snapshot = null;
       }
     }

     async close() {
       if (this._inTransaction) {
         try { this._db.run('ROLLBACK'); } catch { /* ignore */ }
         // Restore snapshot on close without explicit rollback
         if (this._snapshot !== null) {
           this._store.setItem(this._storageKey, this._snapshot);
         }
       }
       this._db.close();
       // call grandparent close (skip SqlJsConnection.close to avoid double-close)
       this._closed = true;
     }
   }
   ```
2. Note: `_flush()` is called by Statement/PreparedStatement after each write — not here (connection doesn't know about individual writes). Auto-commit writes go through Statement.

**Inputs:** `packages/sqljs/SqlJsConnection.js`, `LocalStorageStore.js`  
**Expected output:** `packages/sqljs-localstorage/LocalStorageSqlJsConnection.js`

**Verify:**
```bash
node --input-type=module <<'EOF'
import LocalStorageSqlJsConnection from './packages/sqljs-localstorage/LocalStorageSqlJsConnection.js';
console.log(typeof LocalStorageSqlJsConnection === 'function' ? 'class OK' : 'FAIL');
EOF
```

---

### T02 · Implement LocalStorageSqlJsStatement + LocalStorageSqlJsPreparedStatement

**Estimate:** 30 min  
**Files:** `packages/sqljs-localstorage/LocalStorageSqlJsStatement.js`, `packages/sqljs-localstorage/LocalStorageSqlJsPreparedStatement.js`

**Steps:**
1. `LocalStorageSqlJsStatement` — extends `SqlJsStatement`, overrides `_executeUpdate` and `_execute` to call `this._connection._flush()` after a successful write:
   ```js
   import SqlJsStatement from '@alt-javascript/jsdbc-sqljs/SqlJsStatement.js';
   export default class LocalStorageSqlJsStatement extends SqlJsStatement {
     async _executeUpdate(sql) {
       const n = await super._executeUpdate(sql);
       this._connection._flush();
       return n;
     }
     async _execute(sql) {
       const isQuery = await super._execute(sql);
       if (!isQuery) this._connection._flush();
       return isQuery;
     }
   }
   ```
2. `LocalStorageSqlJsPreparedStatement` — same pattern for `_executePreparedUpdate`:
   ```js
   import SqlJsPreparedStatement from '@alt-javascript/jsdbc-sqljs/SqlJsPreparedStatement.js';
   export default class LocalStorageSqlJsPreparedStatement extends SqlJsPreparedStatement {
     async _executePreparedUpdate(sql, params) {
       const n = await super._executePreparedUpdate(sql, params);
       this._connection._flush();
       return n;
     }
   }
   ```

**Inputs:** `packages/sqljs/SqlJsStatement.js`, `packages/sqljs/SqlJsPreparedStatement.js`, `LocalStorageSqlJsConnection.js`  
**Expected output:** `LocalStorageSqlJsStatement.js`, `LocalStorageSqlJsPreparedStatement.js`

**Verify:**
```bash
node --input-type=module <<'EOF'
import LocalStorageSqlJsStatement from './packages/sqljs-localstorage/LocalStorageSqlJsStatement.js';
import LocalStorageSqlJsPreparedStatement from './packages/sqljs-localstorage/LocalStorageSqlJsPreparedStatement.js';
console.log('Statement + PreparedStatement classes OK');
EOF
```

---

### T03 · Implement LocalStorageSqlJsDriver

**Estimate:** 30 min  
**Files:** `packages/sqljs-localstorage/LocalStorageSqlJsDriver.js`

**Steps:**
1. Parse URL: `jsdbc:sqljs:localstorage:<key>` where `<key>` is the localStorage key
2. On connect:
   a. Init SQL module (reuse `SqlJsDriver._SQL` cache or init fresh)
   b. Check if `store.getItem(key)` exists — if so, decode Base64 → Uint8Array → `new SQL.Database(data)`
   c. Otherwise `new SQL.Database()` (fresh)
   d. Return `new LocalStorageSqlJsConnection(db, key, store)`
3. Accept optional `properties.store` (a `LocalStorageStore` instance) for testing; default to `new LocalStorageStore()` (uses `globalThis.localStorage`)
4. Override `_createStatement` and `_prepareStatement` in the connection to return `LocalStorageSqlJs*` subclasses — or do this by overriding in driver:
   - Cleanest: Override `_createStatement` / `_prepareStatement` in `LocalStorageSqlJsConnection` constructor pattern — see below

   In `LocalStorageSqlJsConnection`:
   ```js
   async _createStatement() {
     return new LocalStorageSqlJsStatement(this);
   }
   async _prepareStatement(sql) {
     return new LocalStorageSqlJsPreparedStatement(this, sql);
   }
   ```

5. Auto-register driver with `DriverManager`

**Inputs:** `LocalStorageSqlJsConnection.js`, `Statement.js`, `PreparedStatement.js`  
**Expected output:** `packages/sqljs-localstorage/LocalStorageSqlJsDriver.js`

**URL scheme:** `jsdbc:sqljs:localstorage:myapp-db`

**Verify:**
```bash
node --input-type=module <<'EOF'
import { DriverManager } from '@alt-javascript/jsdbc-core';
import './packages/sqljs-localstorage/LocalStorageSqlJsDriver.js';
const drivers = DriverManager.getDrivers();
const d = drivers.find(d => d.acceptsURL('jsdbc:sqljs:localstorage:test'));
console.log(d ? 'driver registered OK' : 'FAIL: driver not found');
EOF
```

---

### T04 · Driver compliance tests + persistence + rollback tests

**Estimate:** 60 min  
**Files:** `packages/sqljs-localstorage/test/LocalStorageSqlJsDriver.spec.js`

**Steps:**
1. Reuse `driverCompliance.js` from core:
   ```js
   import LocalStorageShim from './LocalStorageShim.js';
   import LocalStorageStore from '../LocalStorageStore.js';
   import { DataSource } from '@alt-javascript/jsdbc-core';
   import '../LocalStorageSqlJsDriver.js';
   import driverComplianceTests from '../../core/test/driverCompliance.js';

   const makeDs = () => {
     const shim = new LocalStorageShim();
     const store = new LocalStorageStore(shim);
     return new DataSource({
       url: 'jsdbc:sqljs:localstorage:testdb',
       properties: { store },
     });
   };
   driverComplianceTests('sqljs-localstorage', makeDs);
   ```

2. Cross-session persistence test (separate describe block):
   ```js
   describe('Cross-session persistence', () => {
     it('data written in one connect() is visible after a fresh connect()', async () => {
       const shim = new LocalStorageShim();
       const store = new LocalStorageStore(shim);
       const props = { store };

       // Session A
       const dsA = new DataSource({ url: 'jsdbc:sqljs:localstorage:sess', properties: props });
       const connA = await dsA.getConnection();
       const stmtA = await connA.createStatement();
       await stmtA.executeUpdate('CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, txt TEXT)');
       await stmtA.executeUpdate("INSERT INTO notes VALUES (1, 'hello')");
       await stmtA.close();
       await connA.close();

       // Session B — same shim, same key
       const dsB = new DataSource({ url: 'jsdbc:sqljs:localstorage:sess', properties: props });
       const connB = await dsB.getConnection();
       const stmtB = await connB.createStatement();
       const rs = await stmtB.executeQuery('SELECT txt FROM notes WHERE id = 1');
       assert.isTrue(rs.next());
       assert.equal(rs.getString('txt'), 'hello');
       rs.close();
       await stmtB.close();
       await connB.close();
     });
   });
   ```

3. Rollback persistence test:
   ```js
   describe('Transaction rollback restores localStorage', () => {
     it('rolled-back INSERT is not visible after fresh connect()', async () => {
       const shim = new LocalStorageShim();
       const store = new LocalStorageStore(shim);
       const props = { store };

       const dsA = new DataSource({ url: 'jsdbc:sqljs:localstorage:txtest', properties: props });
       const connA = await dsA.getConnection();
       const stmtSetup = await connA.createStatement();
       await stmtSetup.executeUpdate('CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY)');
       await stmtSetup.close();

       await connA.setAutoCommit(false);
       const stmtA = await connA.createStatement();
       await stmtA.executeUpdate('INSERT INTO events VALUES (42)');
       await connA.rollback();
       await stmtA.close();
       await connA.close();

       // Fresh connection — row must not exist
       const dsB = new DataSource({ url: 'jsdbc:sqljs:localstorage:txtest', properties: props });
       const connB = await dsB.getConnection();
       const stmtB = await connB.createStatement();
       const rs = await stmtB.executeQuery('SELECT * FROM events WHERE id = 42');
       assert.isFalse(rs.next());
       rs.close();
       await stmtB.close();
       await connB.close();
     });
   });
   ```

**Inputs:** `driverCompliance.js`, `LocalStorageSqlJsDriver.js`, `LocalStorageShim.js`  
**Expected output:** `packages/sqljs-localstorage/test/LocalStorageSqlJsDriver.spec.js`

**Verify:**
```bash
npm test -w packages/sqljs-localstorage 2>&1
# exit 0; all tests green including compliance (14), persistence (1), rollback (1)
```

---

### T05 · Write index.js

**Estimate:** 10 min  
**Files:** `packages/sqljs-localstorage/index.js`

**Steps:**
1. Export the public API:
   ```js
   export { default as LocalStorageSqlJsDriver, LocalStorageSqlJsConnection } from './LocalStorageSqlJsDriver.js';
   export { default as LocalStorageSqlJsStatement } from './LocalStorageSqlJsStatement.js';
   export { default as LocalStorageSqlJsPreparedStatement } from './LocalStorageSqlJsPreparedStatement.js';
   export { default as LocalStorageStore } from './LocalStorageStore.js';
   ```

**Inputs:** All implementation files  
**Expected output:** `packages/sqljs-localstorage/index.js`

**Verify:**
```bash
node --input-type=module 'import "./packages/sqljs-localstorage/index.js"; console.log("index OK")'
```
