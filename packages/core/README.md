# @alt-javascript/jsdbc-core

[![Language](https://img.shields.io/badge/language-JavaScript-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![npm version](https://img.shields.io/npm/v/%40alt-javascript%2Fjsdbc-core)](https://www.npmjs.com/package/@alt-javascript/jsdbc-core)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml/badge.svg)](https://github.com/alt-javascript/jsdbc/actions/workflows/node.js.yml)

Core interfaces for JSDBC — a JDBC-inspired database access facade for JavaScript. This package provides the abstract base classes that all JSDBC drivers implement.

**Part of the [@alt-javascript/jsdbc](https://github.com/alt-javascript/jsdbc) monorepo.**

## Install

```bash
npm install @alt-javascript/jsdbc-core
```

## Interfaces

| Class | Role |
|---|---|
| `Driver` | Creates connections to a specific database. Self-registers with `DriverManager`. |
| `DriverManager` | Static registry. Matches JSDBC URLs to registered drivers. |
| `Connection` | A session to a database. Creates statements, manages transactions. |
| `Statement` | Executes ad-hoc SQL (DDL). |
| `PreparedStatement` | Executes parameterised SQL with `?` placeholders (DML, queries). |
| `ResultSet` | Query results with cursor-based and bulk access. |
| `DataSource` | Connection factory. Create once, call `getConnection()` per unit of work. |
| `SingleConnectionDataSource` | Returns the same connection repeatedly. For in-memory databases. |

## Usage

You don't use `jsdbc-core` alone — install it alongside a driver:

```bash
npm install @alt-javascript/jsdbc-core @alt-javascript/jsdbc-sqlite
```

```javascript
import { DataSource } from '@alt-javascript/jsdbc-core';
import '@alt-javascript/jsdbc-sqlite'; // self-registers

const ds = new DataSource({ url: 'jsdbc:sqlite:./myapp.db' });
const conn = await ds.getConnection();

const ps = await conn.prepareStatement('SELECT * FROM users WHERE id = ?');
ps.setParameter(1, 42);
const rs = await ps.executeQuery();
console.log(rs.getRows());

rs.close();
await conn.close();
```

## Writing a Driver

Implement four classes extending the core abstractions. See the [Driver Guide](https://github.com/alt-javascript/jsdbc/blob/main/docs/driver-guide.md).

## License

MIT
