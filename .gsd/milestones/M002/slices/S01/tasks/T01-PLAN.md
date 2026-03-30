---
estimated_steps: 1
estimated_files: 10
skills_used: []
---

# T01: Implement Teradata driver package

Create packages/teradata/ with TeradataDriver, TeradataConnection, TeradataStatement, TeradataPreparedStatement, cursorUtils, index.js, package.json, README, and test/TeradataDriver.spec.js. Extend packages/core/test/driverCompliance.js with teradata dropSyntax case and ignoreDropError option. Verify npm test exits 0.

## Inputs

- `packages/pg/PgDriver.js`
- `packages/pg/PgConnection.js`
- `packages/pg/PgStatement.js`
- `packages/pg/PgPreparedStatement.js`
- `packages/oracle/OracleDriver.js`
- `packages/core/test/driverCompliance.js`
- `github.com/Teradata/nodejs-driver README (teradatasql API)`

## Expected Output

- `packages/teradata/TeradataDriver.js`
- `packages/teradata/TeradataConnection.js`
- `packages/teradata/TeradataStatement.js`
- `packages/teradata/TeradataPreparedStatement.js`
- `packages/teradata/cursorUtils.js`
- `packages/teradata/index.js`
- `packages/teradata/package.json`
- `packages/teradata/README.md`
- `packages/teradata/test/TeradataDriver.spec.js`

## Verification

npm test (from repo root) exits 0 with all 34 existing tests passing and no regressions
