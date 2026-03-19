# ADR-005: Named Parameter Syntax

- **Status:** Accepted
- **Date:** 2026-03-18
- **Deciders:** Craig Parravicini

## Context

Spring's `NamedParameterJdbcTemplate` uses `:paramName` syntax for named parameters in SQL:

```sql
SELECT * FROM users WHERE name = :name AND age > :minAge
```

We needed to decide whether to adopt this syntax or choose an alternative (e.g. `$name`, `@name`, `{name}`).

## Decision

Use `:paramName` syntax, matching Spring's convention. The `NamedParameterJsdbcTemplate` (in the boot monorepo) parses `:paramName` tokens and converts them to positional `?` placeholders before delegating to `JsdbcTemplate`.

```javascript
await namedTemplate.queryForList(
    'SELECT * FROM users WHERE name = :name AND age > :minAge',
    { name: 'Alice', minAge: 18 }
);
```

## Consequences

**Positive:**
- Familiar to Spring developers — zero learning curve
- Clean syntax that reads naturally in SQL
- Simple parsing — regex replacement of `:[a-zA-Z_]\w*` → `?`

**Negative:**
- Potential conflict with PostgreSQL's `::type` cast syntax — mitigated by matching `:[a-zA-Z_]` (not `::`)
- Repeated parameter names generate multiple `?` placeholders with duplicate values (same as Spring)
