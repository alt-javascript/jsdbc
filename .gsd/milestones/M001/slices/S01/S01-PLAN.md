# M001 · S01 — Package scaffold + LocalStorageStore abstraction

**Milestone:** M001 — jsdbc-sqljs-localstorage  
**Risk:** Low  
**Depends on:** —  
**Proof level:** Unit

## Goal

Create the `packages/sqljs-localstorage` directory with `package.json`, workspace wiring, and a tested `LocalStorageStore` helper that hides the localStorage API behind an injectable interface.

## Success Criteria

- Directory exists; `package.json` is valid
- `LocalStorageStore` unit tests pass (`getItem` / `setItem` / `removeItem` with Map shim)
- `eslint` clean

## Integration Closure

Root workspace `package.json` updated to include new package; `npm install` from root resolves without errors.

## After this

`ls packages/sqljs-localstorage` shows `package.json` and `LocalStorageStore.js`; `npm test -w packages/sqljs-localstorage` runs and passes `LocalStorageStore` unit tests.

---

## Tasks

### T01 · Create package directory + package.json

**Estimate:** 15 min  
**Files:** `packages/sqljs-localstorage/package.json`, root `package.json`

**Steps:**
1. Create `packages/sqljs-localstorage/` directory
2. Write `package.json` following the pattern of `packages/sqljs/package.json`:
   - `name`: `@alt-javascript/jsdbc-sqljs-localstorage`
   - `version`: `1.0.0`
   - `type`: `module`
   - `main`: `index.js`
   - `scripts.test`: `mocha --recursive test/**/*.spec.js`
   - `dependencies`: `@alt-javascript/jsdbc-core: "*"`, `@alt-javascript/jsdbc-sqljs: "*"`, `sql.js: "^1.11.0"`
   - `devDependencies`: `chai: "^4.3.7"`, `mocha: "^10.2.0"`
3. Add `"packages/sqljs-localstorage"` to root `package.json` workspaces array

**Inputs:** `packages/sqljs/package.json`, root `package.json`  
**Expected output:** `packages/sqljs-localstorage/package.json`

**Verify:**
```bash
node -e "JSON.parse(require('fs').readFileSync('packages/sqljs-localstorage/package.json','utf8')); console.log('valid JSON')"
node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log(p.workspaces.includes('packages/sqljs-localstorage') ? 'workspace registered' : 'MISSING')"
```

---

### T02 · Implement LocalStorageStore abstraction

**Estimate:** 30 min  
**Files:** `packages/sqljs-localstorage/LocalStorageStore.js`

**Steps:**
1. Create `LocalStorageStore.js` — a thin class wrapping a storage backend:
   ```js
   export default class LocalStorageStore {
     constructor(backend = globalThis.localStorage) { this._backend = backend; }
     getItem(key)          { return this._backend.getItem(key); }
     setItem(key, value)   { this._backend.setItem(key, value); }  // may throw QuotaExceededError
     removeItem(key)       { this._backend.removeItem(key); }
   }
   ```
2. The constructor accepts any object implementing `{ getItem, setItem, removeItem }` — defaults to `globalThis.localStorage` for browser use; accepts a `Map`-backed shim for testing.
3. Create the Map-backed test shim as a standalone helper in `test/LocalStorageShim.js`:
   ```js
   export default class LocalStorageShim {
     constructor(quotaBytes = Infinity) { this._map = new Map(); this._quota = quotaBytes; }
     getItem(key)  { return this._map.has(key) ? this._map.get(key) : null; }
     setItem(key, value) {
       const size = new TextEncoder().encode(value).length;
       if (size > this._quota) throw Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' });
       this._map.set(key, value);
     }
     removeItem(key) { this._map.delete(key); }
   }
   ```

**Inputs:** —  
**Expected output:** `packages/sqljs-localstorage/LocalStorageStore.js`, `packages/sqljs-localstorage/test/LocalStorageShim.js`

**Verify:**
```bash
node --input-type=module <<'EOF'
import LocalStorageStore from './packages/sqljs-localstorage/LocalStorageStore.js';
import LocalStorageShim from './packages/sqljs-localstorage/test/LocalStorageShim.js';
const store = new LocalStorageStore(new LocalStorageShim());
store.setItem('k', 'hello');
console.assert(store.getItem('k') === 'hello', 'getItem failed');
store.removeItem('k');
console.assert(store.getItem('k') === null, 'removeItem failed');
console.log('LocalStorageStore OK');
EOF
```

---

### T03 · Write LocalStorageStore unit tests

**Estimate:** 20 min  
**Files:** `packages/sqljs-localstorage/test/LocalStorageStore.spec.js`

**Steps:**
1. Create mocha/chai test file covering:
   - `setItem` / `getItem` round-trip
   - `removeItem` leaves `getItem` returning null
   - `getItem` on missing key returns null
   - Quota shim throws when byte limit exceeded
   - Store with default backend uses `globalThis.localStorage` (verify `globalThis.localStorage` is called — skip if undefined)

**Inputs:** `LocalStorageStore.js`, `test/LocalStorageShim.js`  
**Expected output:** `packages/sqljs-localstorage/test/LocalStorageStore.spec.js`

**Verify:**
```bash
npm test -w packages/sqljs-localstorage 2>&1 | tail -10
```
All tests pass, exit 0.
