# M001 — jsdbc-sqljs-localstorage — Milestone Plan

> Detailed planning artifacts are in `.gsd/milestones/M001/slices/S0*/S0*-PLAN.md`

## Vision

Deliver a new package `@alt-javascript/jsdbc-sqljs-localstorage` that wraps the existing `jsdbc-sqljs` driver and automatically persists the in-memory sql.js database to `localStorage` after every write operation. Browser apps get real SQL semantics (joins, transactions, typed columns) that survive page reloads and cross-session navigation — with zero API surface change beyond a new JSDBC URL scheme.

## Slices

| ID | Title | Risk | Depends |
|----|-------|------|---------|
| S01 | Package scaffold + LocalStorageStore abstraction | Low | — |
| S02 | Driver, Connection, Statement + full compliance suite | Medium | S01 |
| S03 | Error handling — QuotaExceededError guard + flush safety | Low | S02 |
| S04 | Workspace wiring, root test script, README + CHANGELOG | Low | S03 |

## Key Design Decisions Captured Here

### 1. Write-through on every `executeUpdate`
Every `_executeUpdate` / `_executePreparedUpdate` call invokes `connection._flush()` immediately after the sql.js write. This is the safest default — no explicit save required from user code.

### 2. Base64 encoding over localStorage
`db.export()` returns a `Uint8Array`. localStorage only stores strings. Base64 encoding is used (`btoa`). This inflates size by ~33% — document clearly. OPFS or IndexedDB are out of scope but would avoid this overhead.

### 3. Injectable LocalStorageStore
`LocalStorageStore` wraps `{ getItem, setItem, removeItem }`. Injected via `properties.store` in the DataSource config. Defaults to `globalThis.localStorage` for browser use. A `Map`-backed `LocalStorageShim` enables full test coverage in Node.js without a browser or jsdom.

### 4. Snapshot-based transaction rollback
Before `BEGIN`, the current localStorage value is snapshotted as a string. On `rollback()`, the snapshot is restored — ensuring the on-disk (localStorage) state is also rolled back, not just the in-memory sql.js state.

### 5. Extends sqljs classes, does not copy them
`LocalStorageSqlJsConnection` extends `SqlJsConnection`. `LocalStorageSqlJsStatement` extends `SqlJsStatement`. This avoids code duplication and means future fixes to the sqljs package propagate automatically.
