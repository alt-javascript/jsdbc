# ADR-001: All-Async API

- **Status:** Accepted
- **Date:** 2026-03-18
- **Deciders:** Craig Parravicini

## Context

JDBC methods are synchronous — they block the calling thread until the database responds. JavaScript is single-threaded and non-blocking. We needed to decide whether JSDBC should mirror JDBC's synchronous signatures or adopt JavaScript's async model.

Some JS database drivers are synchronous (better-sqlite3), while most are async (pg, mysql2, tedious). A synchronous API would only work with synchronous drivers.

## Decision

All JSDBC interface methods that perform I/O return `Promise`. Callers use `async`/`await`.

```javascript
const conn = await dataSource.getConnection();
const rs = await ps.executeQuery();
await conn.close();
```

## Consequences

**Positive:**
- Works with all JavaScript database drivers — synchronous drivers wrapped trivially
- Idiomatic JavaScript — aligns with how every JS developer writes I/O code
- Non-blocking — database calls don't freeze the event loop
- The only visible difference from JDBC is adding `await`

**Negative:**
- Every call site requires `await`, adding mild verbosity
- Error handling requires `try`/`catch` with `async` functions (not try-with-resources)
- Synchronous drivers (better-sqlite3) pay a trivial overhead wrapping in Promises
