Test matrix for GSTA-7 database schema

1) Unit tests (fast, run in CI)
  - Validate ORM model mappings (if using an ORM): ensure fields, types, defaults match schema.sql.
  - Validate SQL generation for queries used by the app (sanity-check generated SQL).

2) Integration tests (CI with ephemeral Postgres)
  - Deploy migrations to an ephemeral Postgres container (use pg:latest or our recommended image).
  - Run CRUD flows:
    - Create organization, user, project, resource
    - Update resource and assert updated_at changes and audit log entry created
    - Soft-delete resource and assert it's excluded from active_resources view but present in resources with deleted_at
  - Referential integrity tests: delete organization and ensure cascading deletes for tenant-owned tables.

3) Migration tests (before applying to prod)
  - Run migration up/down in CI in a fresh DB to ensure no syntax errors and down migrations work (if supported).
  - Run migrations against a copy of production schema (if feasible) and run smoke tests.

4) Backfill tests
  - For any backfill script, run on staging snapshot and measure runtime, memory/CPU. Ensure idempotency.

5) Performance tests
  - Create synthetic dataset (millions of resources) and run common queries to verify index usage and response times.

6) Backup & restore verification
  - Periodically (monthly) test restore from backup to staging to ensure backups are restorable and data integrity holds.

CI steps
--------
1. On PR, spin up ephemeral Postgres using Docker compose or testcontainers.
2. Run migrations.
3. Run unit tests and integration tests.
4. If migration modifies data shape in a non-additive way, require manual approval and run migration rehearsal on staging.

Acceptance criteria (tests)
--------------------------
- All unit and integration tests pass in CI.
- Migration up/down succeeds in ephemeral DB.
- A staging restore test completes successfully before production migration.
