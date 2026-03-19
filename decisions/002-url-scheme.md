# ADR-002: JSDBC URL Scheme

- **Status:** Accepted
- **Date:** 2026-03-18
- **Deciders:** Craig Parravicini

## Context

JDBC uses a URL scheme (`jdbc:subprotocol:connection-details`) to identify which driver handles a connection. JSDBC needed a URL convention for the same purpose.

Options considered:
1. Reuse `jdbc:` prefix — confusing, implies Java interop that doesn't exist
2. Use plain connection strings — no standard dispatch mechanism
3. Use `jsdbc:` prefix — mirrors JDBC, clearly identifies the JS variant

## Decision

JSDBC URLs use the scheme `jsdbc:<subprotocol>:<connection-details>`.

```
jsdbc:sqlite:./myapp.db
jsdbc:sqlite::memory:
jsdbc:sqljs:memory
jsdbc:pg://localhost:5432/mydb
jsdbc:mysql://localhost:3306/mydb
```

`DriverManager.getConnection(url)` iterates registered drivers, calling `acceptsURL(url)` to find the handler.

## Consequences

**Positive:**
- Familiar to JDBC developers — same pattern, different prefix
- Clean dispatch mechanism — drivers declare which URLs they handle
- Extensible — new databases just need a new subprotocol

**Negative:**
- Another URL scheme to learn (though it's trivially mappable from JDBC)
- Connection details after the subprotocol are driver-specific — no enforced structure
