# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-03-26

### Fixed

- Bumped all package versions from `1.0.0` to `1.1.1` to resolve npm publish collision.
  All packages (`jsdbc-core`, `jsdbc-sqlite`, `jsdbc-sqljs`, `jsdbc-sqljs-localstorage`,
  `jsdbc-pg`, `jsdbc-mysql`, `jsdbc-mssql`, `jsdbc-oracle`) are now version-aligned
  at `1.1.1`.

## [1.1.0] - 2026-03-26

### Added

- `@alt-javascript/jsdbc-sqljs-localstorage` — new package wrapping `@alt-javascript/jsdbc-sqljs`
  with automatic `localStorage` write-through persistence. URL scheme:
  `jsdbc:sqljs:localstorage:<key>`. Browser apps get full SQL semantics (joins, transactions,
  typed columns) that survive page reloads and cross-session navigation.
  - Every `executeUpdate` / `executePreparedUpdate` serialises the sql.js database to Base64
    and persists it via `localStorage.setItem`.
  - On first connect, if a snapshot exists it is restored via `new SQL.Database(data)`.
  - Transactions are snapshot-backed: the pre-`BEGIN` localStorage value is captured and
    restored on `rollback()` so on-disk state rolls back alongside in-memory state.
  - Injectable `LocalStorageStore` abstraction enables full Node.js test coverage without
    a browser or jsdom.
  - `QuotaExceededError` is caught and rethrown with the storage key and approximate size
    so storage pressure is diagnosable. The in-memory database remains usable after a
    failed flush.

## [1.0.0] - 2026-03-18

### Added

- Core interfaces: `Driver`, `Connection`, `Statement`, `PreparedStatement`, `ResultSet`, `DataSource`, `DriverManager`
- `SingleConnectionDataSource` for in-memory databases
- `PooledDataSource` with built-in `SimpleConnectionPool` (zero dependencies)
- `TarnPoolAdapter` and `GenericPoolAdapter` for pluggable production pooling
- `ConnectionPool` abstract interface for custom pool implementations
- Driver auto-registration via `DriverManager`
- JSDBC URL scheme: `jsdbc:<subprotocol>:<connection-details>`
- `?` placeholder parameter binding across all drivers
- Transaction support: `setAutoCommit(false)`, `commit()`, `rollback()`
- Six database drivers:
  - `@alt-javascript/jsdbc-sqlite` — better-sqlite3
  - `@alt-javascript/jsdbc-sqljs` — sql.js (WebAssembly, browser-compatible)
  - `@alt-javascript/jsdbc-pg` — PostgreSQL via pg
  - `@alt-javascript/jsdbc-mysql` — MySQL/MariaDB via mysql2
  - `@alt-javascript/jsdbc-mssql` — SQL Server via tedious
  - `@alt-javascript/jsdbc-oracle` — Oracle via oracledb (Thin mode)

[1.1.1]: https://github.com/alt-javascript/jsdbc/releases/tag/v1.1.1
[1.1.0]: https://github.com/alt-javascript/jsdbc/releases/tag/v1.1.0
[1.0.0]: https://github.com/alt-javascript/jsdbc/releases/tag/v1.0.0
