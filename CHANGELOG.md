# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/alt-javascript/jsdbc/releases/tag/v1.0.0
