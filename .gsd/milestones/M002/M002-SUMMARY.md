---
id: M002
title: "Teradata Driver"
status: complete
completed_at: 2026-03-30T19:29:22.743Z
key_decisions:
  - teradatasql.connectAsync used throughout for async consistency
  - cursorUtils.js introduced to handle teradatasql's positional-array row format
  - Native ? placeholders in teradatasql: no conversion needed unlike pg/oracle
  - ignoreDropError added to shared driverCompliance.js for clean Teradata DDL handling
  - Compliance options: SAMPLE 1, FLOAT, VARCHAR(255), ifNotExists:false, dropSyntax:teradata
key_files:
  - packages/teradata/TeradataDriver.js
  - packages/teradata/TeradataConnection.js
  - packages/teradata/TeradataStatement.js
  - packages/teradata/TeradataPreparedStatement.js
  - packages/teradata/cursorUtils.js
  - packages/teradata/index.js
  - packages/teradata/package.json
  - packages/teradata/README.md
  - packages/teradata/test/TeradataDriver.spec.js
  - packages/core/test/driverCompliance.js
lessons_learned:
  - teradatasql returns rows as positional arrays — check the cursor model of any new driver before assuming object rows
  - ignoreDropError as a shared compliance option is cleaner than per-driver test workarounds for databases lacking DROP TABLE IF EXISTS
  - SAMPLE n is Teradata's equivalent of LIMIT n — not documented in the standard JSDBC compliance options
---

# M002: Teradata Driver

**Added @alt-javascript/jsdbc-teradata driver package via teradatasql with full JSDBC API surface and compliance test wiring**

## What Happened

Single-slice milestone delivering the Teradata JSDBC driver. The implementation followed the established pg/oracle patterns closely. The main non-obvious aspect was teradatasql's cursor model: rows are returned as positional arrays rather than objects, requiring cursorUtils.js to zip description column names with row values. Teradata natively supports ? parameter markers so no placeholder conversion was needed. The shared compliance helper was extended with a teradata dropSyntax case and ignoreDropError flag to handle the absence of DROP TABLE IF EXISTS. All 34 existing tests continued to pass throughout.

## Success Criteria Results

All 9 success criteria met. See VALIDATION.md for checklist.

## Definition of Done Results

- ✅ All slice tasks verified green (T01 complete, npm test 34 passing)\n- ✅ npm test from root exits 0, no regressions\n- ✅ All source files implemented with real logic\n- ✅ cursorUtils.js correctly maps positional rows to lowercase-keyed objects\n- ✅ TeradataDriver parses URL and connects via teradatasql.connectAsync\n- ✅ driverCompliance.js ignoreDropError and teradata dropSyntax added cleanly

## Requirement Outcomes

Teradata connectivity requirement delivered and verified at contract level (static + npm test). Integration-level proof gated on live Teradata environment availability.

## Deviations

None. Delivered as planned in a single session.

## Follow-ups

Connection pooling with Teradata (PooledDataSource + TarnPoolAdapter) untested — likely works but should be verified. FastLoad/FastExport support could be a future milestone. CI pipeline needs a Teradata environment to run compliance tests automatically.
