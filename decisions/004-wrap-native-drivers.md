# ADR-004: Wrap Existing Native Drivers

- **Status:** Accepted
- **Date:** 2026-03-18
- **Deciders:** Craig Parravicini

## Context

JSDBC needs to connect to real databases. Two approaches:

1. Implement database wire protocols from scratch in JavaScript
2. Wrap existing battle-tested JavaScript database drivers behind the JSDBC interface

## Decision

Wrap existing drivers. Each JSDBC driver package depends on a proven native driver:

| JSDBC Package | Wraps | Stars | Maturity |
|---|---|---|---|
| `jsdbc-sqlite` | better-sqlite3 | 6k+ | Proven, actively maintained |
| `jsdbc-sqljs` | sql.js | 13k+ | Proven, WebAssembly-based |
| `jsdbc-pg` (planned) | pg | 12k+ | De facto standard for PostgreSQL |
| `jsdbc-mysql` (planned) | mysql2 | 4k+ | De facto standard for MySQL |
| `jsdbc-mssql` (planned) | tedious/mssql | 2k+/2k+ | Microsoft-aligned TDS implementation |

## Consequences

**Positive:**
- Proven, battle-tested database connectivity — no protocol bugs to discover
- Immediate production readiness — the hard problems (connection handling, data type mapping, TLS) are solved
- Active maintenance by dedicated communities
- JSDBC stays thin — a facade, not a reimplementation

**Negative:**
- Each driver package adds a dependency
- JSDBC is limited by what the underlying driver supports
- Version coupling — underlying driver updates may require JSDBC driver updates
