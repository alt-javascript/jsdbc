# ADR-007: Template Layer in Boot Monorepo

- **Status:** Accepted
- **Date:** 2026-03-18
- **Deciders:** Craig Parravicini

## Context

`JsdbcTemplate` and `NamedParameterJsdbcTemplate` provide Spring JdbcTemplate-equivalent convenience methods over JSDBC connections. They naturally integrate with:
- Dependency injection (inject a `DataSource`, get a template)
- Configuration (data source URLs from config)
- Lifecycle management (connection cleanup on context close)
- Transaction management (future `@Transactional`-style support)

These are all concerns of the `@alt-javascript/boot` monorepo (which contains CDI, config, and boot).

## Decision

The template layer lives in the `@alt-javascript/boot` monorepo (altjs), not in the JSDBC monorepo. JSDBC contains only the driver-level packages: core interfaces, and individual database drivers.

```
jsdbc/                          boot (altjs)/
  packages/core                   packages/jsdbc-template
  packages/sqlite                 packages/cdi
  packages/sqljs                  packages/config
  packages/pg (planned)           packages/boot
```

## Consequences

**Positive:**
- Template layer has natural access to CDI, config, and lifecycle
- Boot auto-configuration can wire `DataSource` → `JsdbcTemplate` from config properties
- JSDBC stays focused: interfaces + drivers, no framework coupling
- Clean dependency direction: template depends on jsdbc-core, not the reverse

**Negative:**
- Template usage requires packages from two monorepos
- Template can't be used without the boot monorepo (though users can use jsdbc-core directly)
