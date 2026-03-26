# For JDBC Developers

A guide for Java developers migrating to JSDBC. This maps JDBC concepts to their JSDBC equivalents, explains what's the same, what's different, and why.

## Concept Mapping

| JDBC / Spring | JSDBC | Notes |
|---|---|---|
| `java.sql.DriverManager` | `DriverManager` | Same role — static driver registry, `getConnection(url)` |
| `java.sql.Driver` | `Driver` | Same role — `acceptsURL()`, `connect()` |
| `java.sql.Connection` | `Connection` | Same — `createStatement()`, `prepareStatement()`, `commit()`, `rollback()` |
| `java.sql.Statement` | `Statement` | Same — `executeQuery()`, `executeUpdate()` |
| `java.sql.PreparedStatement` | `PreparedStatement` | Same — `setParameter()` (1-based), `executeQuery()`, `executeUpdate()` |
| `java.sql.ResultSet` | `ResultSet` | Same cursor model — `next()`, `getObject()`, `getString()`, `getInt()` |
| `javax.sql.DataSource` | `DataSource` | Same — connection factory, `getConnection()` |
| `jdbc:subprotocol:` | `jsdbc:subprotocol:` | Same scheme, different prefix |
| `Class.forName("com.mysql.Driver")` | `import '@alt-javascript/jsdbc-mysql'` | ES module import triggers self-registration |
| `setAutoCommit(false)` | `setAutoCommit(false)` | Identical transaction model |
| `connection.close()` | `await connection.close()` | Async — all operations return Promises |
| Connection pooling (HikariCP) | `PooledDataSource` | Built-in pool, or plug in tarn.js / generic-pool |

### Driver Mapping

| JDBC Driver | JSDBC Package | URL Scheme |
|---|---|---|
| `org.sqlite.JDBC` | `@alt-javascript/jsdbc-sqlite` | `jsdbc:sqlite:` |
| `org.postgresql.Driver` | `@alt-javascript/jsdbc-pg` | `jsdbc:pg://` |
| `com.mysql.cj.jdbc.Driver` | `@alt-javascript/jsdbc-mysql` | `jsdbc:mysql://` |
| `com.microsoft.sqlserver.jdbc.SQLServerDriver` | `@alt-javascript/jsdbc-mssql` | `jsdbc:mssql://` |
| `oracle.jdbc.OracleDriver` | `@alt-javascript/jsdbc-oracle` | `jsdbc:oracle://` |
| N/A (browser) | `@alt-javascript/jsdbc-sqljs` | `jsdbc:sqljs:` |
| N/A (browser + persistent) | `@alt-javascript/jsdbc-sqljs-localstorage` | `jsdbc:sqljs:localstorage:` |

## Side-by-Side Examples

### Basic Query

**JDBC (Java):**
```java
Connection conn = dataSource.getConnection();
try {
    PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?");
    ps.setInt(1, 42);
    ResultSet rs = ps.executeQuery();
    while (rs.next()) {
        System.out.println(rs.getString("name"));
    }
} finally {
    conn.close();
}
```

**JSDBC (JavaScript):**
```javascript
const conn = await dataSource.getConnection();
try {
    const ps = await conn.prepareStatement('SELECT * FROM users WHERE id = ?');
    ps.setParameter(1, 42);
    const rs = await ps.executeQuery();
    while (rs.next()) {
        console.log(rs.getObject('name'));
    }
} finally {
    await conn.close();
}
```

The only structural difference is `await` — JavaScript's async model requires it before every I/O operation. The flow, method names, and connection lifecycle are otherwise identical.

### Transaction

**JDBC (Java):**
```java
Connection conn = dataSource.getConnection();
conn.setAutoCommit(false);
try {
    PreparedStatement ps = conn.prepareStatement("INSERT INTO orders (item, qty) VALUES (?, ?)");
    ps.setString(1, "Widget");
    ps.setInt(2, 5);
    ps.executeUpdate();
    conn.commit();
} catch (SQLException e) {
    conn.rollback();
    throw e;
} finally {
    conn.close();
}
```

**JSDBC (JavaScript):**
```javascript
const conn = await dataSource.getConnection();
await conn.setAutoCommit(false);
try {
    const ps = await conn.prepareStatement('INSERT INTO orders (item, qty) VALUES (?, ?)');
    ps.setParameter(1, 'Widget');
    ps.setParameter(2, 5);
    await ps.executeUpdate();
    await conn.commit();
} catch (err) {
    await conn.rollback();
    throw err;
} finally {
    await conn.close();
}
```

## What's the Same

**Connection lifecycle.** Get connection → use → close in finally. Identical pattern.

**Transaction model.** `setAutoCommit(false)` → operations → `commit()` / `rollback()`. Identical semantics.

**PreparedStatement parameters.** 1-based indexing. `setParameter(1, value)` maps to `?` placeholders. Same SQL injection prevention.

**ResultSet cursor.** Starts before first row. Call `next()` to advance. `getObject()` / `getString()` / `getInt()` access column values. Same mental model.

**DriverManager registry.** Drivers register themselves. `getConnection(url)` finds the right driver. Same dispatch pattern.

**URL scheme.** `jsdbc:sqlite:./db.sqlite` mirrors `jdbc:sqlite:./db.sqlite`.

## What's Different

### Everything is Async

JDBC methods are synchronous (they block the thread). JSDBC methods return `Promise` and must be `await`ed. This is the single biggest difference and it's unavoidable — JavaScript is single-threaded.

```javascript
// Every database operation needs await
const conn = await ds.getConnection();
const ps = await conn.prepareStatement(sql);
const rs = await ps.executeQuery();
await conn.close();
```

### No Type System

JDBC has typed setters (`setInt`, `setString`, `setTimestamp`). JSDBC has a single `setParameter()` because JavaScript is dynamically typed. The typed methods (`setString`, `setInt`, `setFloat`, `setNull`) exist as aliases for API familiarity but all delegate to `setParameter`.

### ResultSet Has Bulk Access

JDBC's `ResultSet` only supports cursor iteration. JSDBC adds `getRows()` which returns all rows as plain objects — more natural in JavaScript:

```javascript
const rows = rs.getRows(); // [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}]
```

### No Checked Exceptions

Java's `SQLException` is checked — you must handle or declare it. JavaScript has no checked exceptions. JSDBC throws plain `Error` instances with descriptive messages.

### Driver Loading via ES Module Import

JDBC uses `Class.forName()` or service loader. JSDBC uses ES module imports — importing the driver package triggers self-registration:

```javascript
import '@alt-javascript/jsdbc-sqlite'; // that's it — driver is registered
```

### Connection Pooling

JDBC applications use HikariCP, c3p0, or similar. JSDBC provides `PooledDataSource` with a built-in `SimpleConnectionPool` (zero dependencies). For production, plug in `tarn.js` or `generic-pool` via `TarnPoolAdapter` or `GenericPoolAdapter`:

```javascript
import { PooledDataSource } from '@alt-javascript/jsdbc-core';

const ds = new PooledDataSource({
  url: 'jsdbc:pg://localhost:5432/mydb',
  username: 'user', password: 'pass',
  pool: { min: 0, max: 10 },
});
```

### Browser Support

JDBC is JVM-only. JSDBC's `sql.js` driver runs the same SQL in the browser via WebAssembly. Write isomorphic database code that works in Node.js and the browser.
