# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? | Made By |
|---|------|-------|----------|--------|-----------|------------|---------|
| D001 | M002/S01 | pattern | Which teradatasql connection API to use | teradatasql.connectAsync | JSDBC is an all-async API; connectAsync returns a Promise and is consistent with every other driver's connect pattern. Synchronous teradatasql.connect would block the event loop. | No | agent |
| D002 | M002/S01 | pattern | How to convert teradatasql positional row arrays into plain objects | cursorUtils.js shared helper zips cursor.description[n][0] with row[n] | teradatasql returns rows as positional arrays, not objects. All other JSDBC drivers return lowercase-keyed plain objects. A shared helper extracts column names from cursor.description and zips them with row values, normalising to lowercase — consistent with pg and oracle drivers. | Yes — if teradatasql adds an object-row mode | agent |
| D003 | M002/S01 | convention | How to handle databases lacking DROP TABLE IF EXISTS in the compliance test suite | ignoreDropError option added to shared driverCompliance.js | Teradata has no DROP TABLE IF EXISTS. Rather than a per-driver workaround in the test file, an ignoreDropError flag was added to the shared compliance helper so the error is swallowed in beforeEach. Backward-compatible — defaults to false. | No | agent |
