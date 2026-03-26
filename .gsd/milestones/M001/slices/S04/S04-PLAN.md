# M001 · S04 — Workspace wiring, root test script, README + CHANGELOG

**Milestone:** M001 — jsdbc-sqljs-localstorage  
**Risk:** Low  
**Depends on:** S03  
**Proof level:** Smoke

## Goal

Wire the new package into the root `npm test` script, add it to the monorepo README package table, write its own README.md with usage examples, and add a CHANGELOG.md entry.

## Success Criteria

- `npm test` from repo root exits 0 and includes `sqljs-localstorage` output
- README package table includes the new row
- Package README has install + usage + URL scheme docs
- CHANGELOG entry present

## Integration Closure

`npm test` from root covers all packages including `sqljs-localstorage` with no regressions.

---

## Tasks

### T01 · Update root npm test script

**Estimate:** 10 min  
**Files:** root `package.json`

**Steps:**
1. Add `-w packages/sqljs-localstorage` to the root `scripts.test` command:
   ```json
   "test": "npm test -w packages/core -w packages/sqlite -w packages/sqljs -w packages/sqljs-localstorage"
   ```
2. Ensure `packages/sqljs-localstorage` is already in `workspaces` (done in S01/T01).

**Inputs:** root `package.json`  
**Expected output:** Updated root `package.json`

**Verify:**
```bash
npm test 2>&1 | tail -20
# exit 0; all suites pass including new package
```

---

### T02 · Write package README.md

**Estimate:** 30 min  
**Files:** `packages/sqljs-localstorage/README.md`

**Steps:**
Write a README modelled on `packages/sqljs/README.md` covering:
- Badges (language, npm, license, CI)
- One-paragraph description: "JSDBC driver for SQLite via sql.js with automatic localStorage persistence. Write SQL in the browser — data survives page reloads."
- Install section
- Basic usage example (create table, insert, reload page, select)
- URL scheme: `jsdbc:sqljs:localstorage:<key>`
- Custom store injection (for testing / custom backends)
- Size limit / VACUUM advisory
- When to use / when not to use (vs jsdbc-sqljs for pure in-memory)
- Link to monorepo

**Inputs:** `packages/sqljs/README.md` (template)  
**Expected output:** `packages/sqljs-localstorage/README.md`

**Verify:**
```bash
wc -l packages/sqljs-localstorage/README.md
# Should have > 60 lines
```

---

### T03 · Update root README package table

**Estimate:** 10 min  
**Files:** `README.md`

**Steps:**
1. Add a row to the "Packages" table in `README.md`:
   ```
   | [`@alt-javascript/jsdbc-sqljs-localstorage`](packages/sqljs-localstorage/) | SQLite via sql.js (Wasm) with localStorage persistence | Browser |
   ```
2. Add a row to the "Supported Databases" table:
   ```
   | SQLite (browser + persistent) | `jsdbc-sqljs-localstorage` | sql.js (Wasm) + localStorage | `?` (native) | ✓ |
   ```

**Inputs:** `README.md`  
**Expected output:** Updated `README.md`

**Verify:**
```bash
grep "sqljs-localstorage" README.md | wc -l
# Should be >= 2
```

---

### T04 · Add CHANGELOG.md entry

**Estimate:** 10 min  
**Files:** `CHANGELOG.md`

**Steps:**
1. Add a new entry at the top of `CHANGELOG.md`:
   ```markdown
   ## [Unreleased]

   ### Added
   - `@alt-javascript/jsdbc-sqljs-localstorage` — new package wrapping `jsdbc-sqljs` with automatic
     localStorage write-through persistence. URL scheme: `jsdbc:sqljs:localstorage:<key>`.
     Data survives page reloads and cross-session navigation. Injectable `LocalStorageStore`
     abstraction enables Node.js testing without a real browser.
   ```

**Inputs:** `CHANGELOG.md`  
**Expected output:** Updated `CHANGELOG.md`

**Verify:**
```bash
head -10 CHANGELOG.md | grep -i "unreleased\|localstorage"
```

---

### T05 · Final smoke: npm test from root

**Estimate:** 5 min

**Steps:**
1. Run `npm install` from root to ensure workspace symlinks are up to date
2. Run `npm test` from root
3. Confirm all packages pass

**Verify:**
```bash
npm install && npm test 2>&1 | tail -30
# exit 0; passing: core, sqlite, sqljs, sqljs-localstorage
```
