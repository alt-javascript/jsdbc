# ADR-006: Isomorphic Browser Support via sql.js

- **Status:** Accepted
- **Date:** 2026-03-18
- **Deciders:** Craig Parravicini

## Context

The `@alt-javascript` ecosystem is built for isomorphic JavaScript — code that runs identically in Node.js and the browser. JSDBC needed a browser-compatible SQL engine.

Options evaluated:
- **sql.js** — SQLite compiled to WebAssembly via Emscripten. 13.5k stars. In-memory databases, broad browser compatibility.
- **@sqlite.org/sqlite-wasm** — Official SQLite Wasm build. OPFS persistence in Chrome. Newer, smaller community.
- **PGlite** — PostgreSQL in Wasm. Emerging, less mature.

## Decision

Use sql.js as the primary browser driver (`@alt-javascript/jsdbc-sqljs`). It provides:
- Full SQLite SQL support in-memory
- Node.js and browser compatibility from the same package
- Proven stability (13.5k GitHub stars, widely used)
- No filesystem dependency — works in any JavaScript environment

## Consequences

**Positive:**
- True isomorphic SQL — same queries, same driver API, Node.js and browser
- Mature, well-tested WebAssembly implementation
- In-memory databases are ideal for client-side apps, testing, and offline-first patterns

**Negative:**
- In-memory only — no persistence across page reloads (without additional OPFS integration)
- WebAssembly binary adds ~1MB to browser bundle
- SQLite dialect only — PostgreSQL or MySQL-specific SQL won't work
