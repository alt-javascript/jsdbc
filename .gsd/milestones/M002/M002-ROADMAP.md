# M002: 

## Vision
Add a JSDBC driver for Teradata via the official `teradatasql` npm package, following the same structure and conventions as the existing pg, oracle, sqlite, and sqljs drivers. The new `@alt-javascript/jsdbc-teradata` package gives JavaScript apps a standard JSDBC interface to Teradata — URL-based connection, Statement, PreparedStatement, ResultSet, transactions — with zero changes required to code already written against the JSDBC core API.

## Slice Overview
| ID | Slice | Risk | Depends | Done | After this |
|----|-------|------|---------|------|------------|
| S01 | Teradata driver implementation | medium | — | ✅ | After this: `import '@alt-javascript/jsdbc-teradata'` registers the driver; a DataSource with `jsdbc:teradata://host/db` URL connects to Teradata and exposes the full JSDBC API. |
