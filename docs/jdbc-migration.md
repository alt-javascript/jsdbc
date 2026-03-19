# For JDBC Developers

A guide for Java developers migrating to JSDBC. This maps JDBC and Spring `JdbcTemplate` concepts to their JSDBC equivalents, explains what's the same, what's different, and why.

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
| Spring `JdbcTemplate` | `JsdbcTemplate` (boot monorepo) | Same API pattern — `queryForList`, `queryForObject`, `update` |
| Spring `NamedParameterJdbcTemplate` | `NamedParameterJsdbcTemplate` (boot monorepo) | Same — `:paramName` → `?` conversion |
| Spring `RowMapper<T>` | `(row, index) => mapped` | Plain function, same role |
| Spring `@Transactional` | `executeInTransaction(async (tx) => {...})` | Callback-based — no annotation equivalent |
| Connection pooling (HikariCP) | Planned via tarn.js | Not yet implemented |
| `@ConfigurationProperties(prefix="spring.datasource")` | Boot auto-configuration (planned) | Not yet implemented |

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

### Spring JdbcTemplate → JsdbcTemplate

**Spring (Java):**
```java
List<User> users = jdbcTemplate.query(
    "SELECT * FROM users WHERE age > ?",
    new Object[]{18},
    (rs, rowNum) -> new User(rs.getLong("id"), rs.getString("name"))
);

User user = jdbcTemplate.queryForObject(
    "SELECT * FROM users WHERE id = ?",
    new Object[]{42},
    (rs, rowNum) -> new User(rs.getLong("id"), rs.getString("name"))
);

int count = jdbcTemplate.update(
    "INSERT INTO users (name, age) VALUES (?, ?)",
    "Alice", 30
);
```

**JSDBC (JavaScript):**
```javascript
const users = await jsdbcTemplate.queryForList(
    'SELECT * FROM users WHERE age > ?',
    [18],
    (row) => ({ id: row.id, name: row.name })
);

const user = await jsdbcTemplate.queryForObject(
    'SELECT * FROM users WHERE id = ?',
    [42],
    (row) => ({ id: row.id, name: row.name })
);

const count = await jsdbcTemplate.update(
    'INSERT INTO users (name, age) VALUES (?, ?)',
    ['Alice', 30]
);
```

### Spring NamedParameterJdbcTemplate → NamedParameterJsdbcTemplate

**Spring (Java):**
```java
Map<String, Object> params = Map.of("name", "Alice", "minAge", 18);
List<User> users = namedTemplate.query(
    "SELECT * FROM users WHERE name = :name AND age > :minAge",
    params,
    rowMapper
);
```

**JSDBC (JavaScript):**
```javascript
const users = await namedTemplate.queryForList(
    'SELECT * FROM users WHERE name = :name AND age > :minAge',
    { name: 'Alice', minAge: 18 },
    (row) => ({ id: row.id, name: row.name })
);
```

## What's the Same

**Connection lifecycle.** Get connection → use → close in finally. Identical pattern.

**Transaction model.** `setAutoCommit(false)` → operations → `commit()` / `rollback()`. Identical semantics.

**PreparedStatement parameters.** 1-based indexing. `setParameter(1, value)` maps to `?` placeholders. Same SQL injection prevention.

**ResultSet cursor.** Starts before first row. Call `next()` to advance. `getObject()` / `getString()` / `getInt()` access column values. Same mental model.

**DriverManager registry.** Drivers register themselves. `getConnection(url)` finds the right driver. Same dispatch pattern.

**URL scheme.** `jsdbc:sqlite:./db.sqlite` mirrors `jdbc:sqlite:./db.sqlite`.

**Named parameters.** `:paramName` syntax with a `Map` / object. Same parsing, same output.

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

### RowMapper is Simpler

Spring's `RowMapper<T>` receives a `ResultSet` and row number. JSDBC's row mapper receives a plain object (already extracted from the ResultSet):

```javascript
// Spring: (ResultSet rs, int rowNum) -> new User(rs.getString("name"))
// JSDBC:  (row) => ({ name: row.name })
```

### No Checked Exceptions

Java's `SQLException` is checked — you must handle or declare it. JavaScript has no checked exceptions. JSDBC throws plain `Error` instances with descriptive messages.

### Driver Loading via ES Module Import

JDBC uses `Class.forName()` or service loader. JSDBC uses ES module imports — importing the driver package triggers self-registration:

```javascript
import '@alt-javascript/jsdbc-sqlite'; // that's it — driver is registered
```

### No Connection Pooling (Yet)

JDBC applications use HikariCP, c3p0, or similar. JSDBC pooling via tarn.js is planned but not yet implemented. For now, `DataSource` creates a new connection per `getConnection()` call.

### Browser Support

JDBC is JVM-only. JSDBC's `sql.js` driver runs the same SQL in the browser via WebAssembly. Write isomorphic database code that works in Node.js and the browser.
