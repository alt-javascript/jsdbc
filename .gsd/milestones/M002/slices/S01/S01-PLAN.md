# S01: Teradata driver implementation

**Goal:** Implement all Teradata driver source files, register the package in the workspace, extend the shared compliance helper for Teradata DDL quirks, and wire the compliance test.
**Demo:** After this: After this: `import '@alt-javascript/jsdbc-teradata'` registers the driver; a DataSource with `jsdbc:teradata://host/db` URL connects to Teradata and exposes the full JSDBC API.

## Tasks
- [x] **T01: Teradata JSDBC driver via teradatasql with cursor-to-object mapping and compliance test wiring** — Create packages/teradata/ with TeradataDriver, TeradataConnection, TeradataStatement, TeradataPreparedStatement, cursorUtils, index.js, package.json, README, and test/TeradataDriver.spec.js. Extend packages/core/test/driverCompliance.js with teradata dropSyntax case and ignoreDropError option. Verify npm test exits 0.
  - Estimate: 1 session
  - Files: packages/teradata/TeradataDriver.js, packages/teradata/TeradataConnection.js, packages/teradata/TeradataStatement.js, packages/teradata/TeradataPreparedStatement.js, packages/teradata/cursorUtils.js, packages/teradata/index.js, packages/teradata/package.json, packages/teradata/README.md, packages/teradata/test/TeradataDriver.spec.js, packages/core/test/driverCompliance.js
  - Verify: npm test (from repo root) exits 0 with all 34 existing tests passing and no regressions
