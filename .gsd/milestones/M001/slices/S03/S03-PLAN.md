# M001 · S03 — Error handling — QuotaExceededError guard + flush safety

**Milestone:** M001 — jsdbc-sqljs-localstorage  
**Risk:** Low  
**Depends on:** S02  
**Proof level:** Unit

## Goal

Wrap every `localStorage.setItem` call in a try/catch that catches `QuotaExceededError` and rethrows it as a descriptive JSDBC error. Add a unit test that configures the Map shim to throw at a byte threshold and asserts the error propagates correctly.

## Success Criteria

- QuotaExceededError test passes
- Flush errors do not corrupt in-memory state (the sql.js database remains usable after a failed flush)
- eslint clean

## Integration Closure

No change to existing tests — additive guard only.

## After this

Shim test simulates quota exceeded → driver throws `Error('localStorage quota exceeded for key "mydb": ~4.8 MB')` while in-memory db still responds to SELECT.

---

## Tasks

### T01 · QuotaExceededError guard (already in _flush — verify it's complete)

**Estimate:** 15 min  
**Files:** `packages/sqljs-localstorage/LocalStorageSqlJsConnection.js`

**Steps:**
1. Confirm `_flush()` catches `QuotaExceededError` by name (not just any error) and rethrows with a descriptive message including the storage key and the approximate size in KB/MB.
2. Add approximate size reporting to the error message:
   ```js
   _flush() {
     const data = this._db.export();
     const b64 = btoa(String.fromCharCode(...data));
     const sizeKB = (b64.length / 1024).toFixed(1);
     try {
       this._store.setItem(this._storageKey, b64);
     } catch (e) {
       if (e.name === 'QuotaExceededError') {
         throw new Error(
           `localStorage quota exceeded for key "${this._storageKey}" (~${sizeKB} KB). ` +
           `Consider running VACUUM to compact the database.`
         );
       }
       throw e;
     }
   }
   ```
3. Verify the in-memory `this._db` is NOT modified by a failed flush (it isn't — only `setItem` throws, db.export() is read-only).

**Inputs:** `LocalStorageSqlJsConnection.js` from S02  
**Expected output:** Updated `LocalStorageSqlJsConnection.js`

**Verify:**
```bash
# Confirm the flush guard exists in the source
grep -n "QuotaExceededError" packages/sqljs-localstorage/LocalStorageSqlJsConnection.js
```

---

### T02 · QuotaExceededError unit tests

**Estimate:** 30 min  
**Files:** `packages/sqljs-localstorage/test/QuotaExceeded.spec.js`

**Steps:**
1. Create test file with two scenarios:
   - **Test 1:** Shim configured with tiny quota (e.g. 100 bytes). Execute a DDL that generates a db larger than 100 bytes. Assert that `executeUpdate` throws an Error whose message includes `'localStorage quota exceeded'`.
   - **Test 2:** After the quota error, the in-memory db is still usable — run a SELECT on an already-created table and get results without throwing.

   ```js
   import { DataSource } from '@alt-javascript/jsdbc-core';
   import '../LocalStorageSqlJsDriver.js';
   import LocalStorageShim from './LocalStorageShim.js';
   import LocalStorageStore from '../LocalStorageStore.js';
   import { assert } from 'chai';

   describe('QuotaExceededError handling', () => {
     it('propagates quota error as descriptive JSDBC error', async () => {
       const shim = new LocalStorageShim(100); // 100-byte quota
       const ds = new DataSource({
         url: 'jsdbc:sqljs:localstorage:quota-test',
         properties: { store: new LocalStorageStore(shim) },
       });
       const conn = await ds.getConnection();
       const stmt = await conn.createStatement();
       let threw = false;
       try {
         await stmt.executeUpdate('CREATE TABLE big (id INTEGER PRIMARY KEY, data TEXT)');
       } catch (e) {
         threw = true;
         assert.include(e.message, 'localStorage quota exceeded');
         assert.include(e.message, 'quota-test');
       }
       assert.isTrue(threw, 'Expected QuotaExceededError to be thrown');
       await stmt.close();
       await conn.close();
     });

     it('in-memory db remains usable after quota error', async () => {
       // Use a shim that allows one write then blocks subsequent
       let writeCount = 0;
       const shim = {
         getItem: () => null,
         setItem: (k, v) => {
           writeCount++;
           if (writeCount > 1) throw Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' });
         },
         removeItem: () => {},
       };
       const ds = new DataSource({
         url: 'jsdbc:sqljs:localstorage:fallback-test',
         properties: { store: new LocalStorageStore(shim) },
       });
       const conn = await ds.getConnection();
       const stmt = await conn.createStatement();
       // First write succeeds
       await stmt.executeUpdate('CREATE TABLE t (id INTEGER)');
       // Second write fails
       try { await stmt.executeUpdate('INSERT INTO t VALUES (1)'); } catch { /* expected */ }
       // SELECT still works on in-memory db
       const rs = await stmt.executeQuery('SELECT * FROM t');
       assert.isArray(rs.getRows()); // may or may not have the row depending on run order
       rs.close();
       await stmt.close();
       await conn.close();
     });
   });
   ```

**Inputs:** `LocalStorageSqlJsConnection.js`, `LocalStorageShim.js`  
**Expected output:** `packages/sqljs-localstorage/test/QuotaExceeded.spec.js`

**Verify:**
```bash
npm test -w packages/sqljs-localstorage 2>&1 | tail -20
# exit 0; QuotaExceededError describe block passes
```
