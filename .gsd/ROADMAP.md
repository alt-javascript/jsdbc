# JSDBC Roadmap

## M001 · jsdbc-sqljs-localstorage — Persistent Browser SQL via localStorage

> Deliver a new package `@alt-javascript/jsdbc-sqljs-localstorage` that wraps the existing `jsdbc-sqljs` driver and automatically persists the in-memory sql.js database to `localStorage` after every write operation. Browser apps get real SQL semantics (joins, transactions, typed columns) that survive page reloads and cross-session navigation — with zero API surface change beyond a new JSDBC URL scheme.

### Success Criteria

- [ ] Package `packages/sqljs-localstorage` exists as a first-class workspace member with its own package.json, index.js, and README
- [ ] URL scheme `jsdbc:sqljs:localstorage:<key>` is handled by the new driver; existing `jsdbc:sqljs:memory` URLs are unaffected
- [ ] On every executeUpdate / executePreparedUpdate the sql.js binary is serialised via `db.export()` and written to localStorage under the configured key
- [ ] On first connect, if the localStorage key exists the binary is loaded via `new SQL.Database(data)` so prior state is restored
- [ ] Explicit `commit()` also triggers a flush; `rollback()` restores the pre-transaction snapshot stored before BEGIN
- [ ] Full driver compliance test suite (reusing core driverCompliance.js) passes in Node.js (via a mock localStorage shim) with 0 failures
- [ ] A cross-session persistence integration test proves data written in one `connect()` call is visible after a fresh `connect()` using the same key
- [ ] The new package is registered in the root workspace `test` script so `npm test` from root covers it
- [ ] CHANGELOG.md and root README package table are updated to document the new package

### Key Risks

| Risk | Why it matters |
|------|---------------|
| localStorage size limit (~5 MB) exceeded by large databases | `db.export()` returns the full SQLite binary; large schemas/data sets will throw `QuotaExceededError`, silently losing writes |
| localStorage is synchronous and blocks the JS thread during serialisation | Frequent writes on large databases could cause perceptible jank; the async JSDBC facade masks this but the timing is real |
| sql.js binary includes free pages; exported size grows monotonically without VACUUM | A database that grows then shrinks still has a large blob, wasting quota |
| Node.js test environment has no real localStorage | The driver must be testable without a browser; a shim must be injected at construction time |
| Transaction rollback must restore the pre-BEGIN snapshot | sql.js ROLLBACK works in-memory, but the localStorage snapshot taken before BEGIN must also be reverted |

### Proof Strategy

| Risk / Unknown | What will be proven | Retired in |
|---|---|---|
| localStorage mock compatibility | Map-backed shim injected via constructor; all serialise/deserialise round-trips produce identical query results | S01 — LocalStorageStore unit tests |
| Cross-session persistence correctness | Write rows with connection A, destroy A, construct connection B with same key, assert rows visible | S02 — integration test |
| Transaction rollback restores localStorage snapshot | BEGIN → INSERT → ROLLBACK → new connection → SELECT returns 0 rows | S02 — transaction compliance tests |
| QuotaExceededError surface and handling | Shim throws QuotaExceededError at byte threshold; driver propagates as Error('localStorage quota exceeded') | S03 — error handling tests |
| Root npm test covers new package | `npm test` from repo root runs all packages including sqljs-localstorage and exits 0 | S04 — workspace wiring |

### Verification

- **Contract:** Every task verify block must be run and exit 0 before the task is marked complete. No exceptions.
- **Integration:** `npm test` from repo root must include the new package and exit 0 with all suites green.
- **UAT:** Driver compliance suite passes against `jsdbc:sqljs:localstorage:testdb` with localStorage shim injected. Cross-session persistence test passes. Quota exceeded error test passes.
- **Operational:** Manual browser smoke test (or jsdom-based integration test) demonstrates a round-trip: write → close tab → reopen → data still present via SELECT.

### Definition of Done

- [ ] All slice tasks verified green
- [ ] `npm test` from root exits 0 (no regressions in existing packages)
- [ ] Driver compliance suite passes for new package (all 14 test cases)
- [ ] Cross-session persistence integration test passes
- [ ] Transaction rollback-restores-localStorage test passes
- [ ] QuotaExceededError propagation test passes
- [ ] README updated with new package in table
- [ ] CHANGELOG.md entry added
- [ ] No TypeScript / lint errors (eslint passes)

---

### Slices

- [ ] **S01** — Package scaffold + LocalStorageStore abstraction *(low risk)*
- [ ] **S02** — Driver, Connection, Statement + full compliance suite *(medium risk)*  ← depends on S01
- [ ] **S03** — Error handling — QuotaExceededError guard + flush safety *(low risk)*  ← depends on S02
- [ ] **S04** — Workspace wiring, root test script, README + CHANGELOG *(low risk)*  ← depends on S03

---

### Boundary Map

```
┌─────────────────────────────────────────────────────────┐
│  packages/sqljs-localstorage  (NEW — this milestone)    │
│                                                         │
│  LocalStorageSqlJsDriver                                │
│    └─ acceptsURL('jsdbc:sqljs:localstorage:*')          │
│                                                         │
│  LocalStorageSqlJsConnection                            │
│    └─ wraps sql.js Database                             │
│    └─ flushes to localStorage after every write         │
│    └─ snapshots before BEGIN, restores on rollback      │
│                                                         │
│  LocalStorageStore  (injectable abstraction)            │
│    └─ default: wraps window.localStorage                │
│    └─ test: Map-backed shim                             │
│                                                         │
│  Statement / PreparedStatement                          │
│    └─ thin subclasses of SqlJsStatement/PS              │
│    └─ call connection._flush() after every write        │
└────────────────────┬────────────────────────────────────┘
                     │ depends on
┌────────────────────▼────────────────────────────────────┐
│  packages/sqljs  (EXISTING — read-only dependency)      │
│  SqlJsStatement, SqlJsPreparedStatement, sql.js wasm    │
└─────────────────────────────────────────────────────────┘
                     │ depends on
┌────────────────────▼────────────────────────────────────┐
│  packages/core  (EXISTING — read-only dependency)       │
│  Connection, Statement, PreparedStatement, ResultSet    │
│  Driver, DriverManager, DataSource                      │
└─────────────────────────────────────────────────────────┘

OUT OF SCOPE:
  • IndexedDB backend (future milestone)
  • Compression / chunking for large blobs
  • Multi-tab synchronisation (StorageEvent)
  • VACUUM scheduling
  • Encryption at rest
```
