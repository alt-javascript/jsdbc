# ADR-003: Driver Self-Registration on Import

- **Status:** Accepted
- **Date:** 2026-03-18
- **Deciders:** Craig Parravicini

## Context

JDBC historically used `Class.forName("com.mysql.jdbc.Driver")` to load and register drivers, later replaced by the ServiceLoader mechanism. JSDBC needed a JavaScript-idiomatic way to register drivers.

## Decision

Each driver package registers itself with `DriverManager` as a side effect of being imported:

```javascript
// Inside @alt-javascript/jsdbc-sqlite/index.js
import SqliteDriver from './SqliteDriver.js';
DriverManager.registerDriver(new SqliteDriver());

// User code
import '@alt-javascript/jsdbc-sqlite'; // driver is now registered
```

## Consequences

**Positive:**
- Zero configuration — import the package and it works
- Familiar to Java developers (`Class.forName` was essentially the same — class loading triggered static initialization)
- Works with ES modules — the import is the registration

**Negative:**
- Side-effect imports (`import 'pkg'` with no bindings) can surprise developers unfamiliar with the pattern
- Tree-shaking tools may remove "unused" imports — requires explicit inclusion
- No lazy loading — driver is registered even if never used in a given code path
