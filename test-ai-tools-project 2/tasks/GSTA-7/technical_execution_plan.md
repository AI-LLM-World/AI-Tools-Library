Locked Technical Execution Plan 176
====================================

Overview
--------
- Purpose: Lock the Phase 2 database schema, provide concrete Prisma mappings, migrations, CI verification, failure-mode mitigations, and a test matrix so engineers can implement and deploy with confidence.
- Scope: organization, user, project, resource, audit_log; UUID primary keys; JSONB for extensible fields; soft deletes; audit append-only logs.

Deliverables
------------
1. Prisma schema (prisma/schema.prisma) aligned to tasks/GSTA-7/schema.sql
2. SQL migration files (initial migration) that produce schema.sql when applied
3. DAL/ORM updates and audit log wiring
4. CI job that runs migrations and integration tests against ephemeral Postgres
5. Backfill scripts and migration runbook with tested rollback/restore steps

Execution Plan
--------------
1) Product alignment (Staff Engineer) 
   - Run 1-hour meeting to confirm domain attributes: resource types, billing/quota fields, searchable fields, any compliance attributes.
   - Output: short PR or doc patch to tasks/GSTA-7/schema.sql and this plan if fields change.

2) Schema Lock and Prisma mapping (CTO / Staff Engineer)
   - Update prisma/schema.prisma to match tasks/GSTA-7/schema.sql. Ensure Postgres types (uuid, timestamptz, jsonb) are represented correctly. Use provider = "postgresql" in datasource for CI migrations; keep dev.sqlite for local convenience but CI should exercise Postgres path.
   - Acceptance: `prisma db pull` on a Postgres ephemeral DB matches schema.sql, and `prisma migrate dev --name init` produces a migration whose SQL is semantically equivalent to schema.sql.

3) Migrations (Release Engineer)
   - Create initial SQL migration files for Postgres (up/down or a single up with runbook), preferably using `prisma migrate` or direct SQL migration tool if the team uses Flyway.
   - Commit migrations under packages/backend/prisma/migrations or infra/migrations depending on repo layout.
   - Add note in runbook: take logical/physical backup (pg_dump or snapshot) before applying to prod.

4) DAL & Audit wiring (Backend Engineer)
   - Update ORM client usage to reference new models. Add helpers for audit log insertion on create/update/delete. Keep audit insertion idempotent and fast (append-only writes). Use DB transactions where necessary to keep event+mutation atomic.

5) Tests & CI (QA Engineer)
   - Add a CI job that starts ephemeral Postgres (Docker), sets DATABASE_URL to it, runs `prisma migrate deploy` (or equivalent) then runs unit and integration tests.
   - Tests to add: CRUD flows, soft-delete semantics, updated_at trigger validation, cascading deletes, and audit log assertions.

6) Backfill & Canary rollout (Release Engineer)
   - Provide backfill scripts as idempotent SQL or app jobs, run on staging with production snapshot. Measure runtime and memory, and break into batches if necessary.
   - Canary rollout: pick a small set of tenants, run migration + smoke tests, monitor metrics, then roll forward.

Failure Modes & Mitigations
--------------------------
- Long-running backfills: perform in background with batching; add progress checkpoints and resumability.
- Migration lock/contention: avoid exclusive DDL on large tables; use CREATE INDEX CONCURRENTLY where possible and create new columns/backfill in background.
- Referential integrity mismatches: add preflight validation script to detect missing parents and either create placeholders or fail fast with remediation steps.
- Migration failure: always have a tested restore plan; for additive changes prefer forward-only migrations and separate data transforms into safe background jobs.

Security & Compliance Notes
--------------------------
- Do not store secrets in metadata JSONB; use tokens referencing secrets managers.
- Principle of least privilege for DB roles; use separate migration role for schema changes.

Test Matrix Summary
-------------------
- Unit tests: model mappings and schema-to-ORM checks.
- Integration: ephemeral Postgres with full migrations and CRUD flows.
- Migration rehearsal: run on staging snapshot and validate restores.
- Performance: synthetic dataset to validate index usage and pagination.

Ownership and Estimates
-----------------------
- GSTA-7.1 Product alignment: Staff Engineer 1 day
- GSTA-7.2 Migrations implementation: Release Engineer 2 days
- GSTA-7.3 DAL / ORM changes: Backend Engineer 3 days
- GSTA-7.4 Backfill scripts & runbook: Release Engineer 1 day
- GSTA-7.5 Tests & CI: QA Engineer 2 days
- GSTA-7.6 Canary rollout & monitoring: Release Engineer 1 day

Next Steps (immediate)
----------------------
1. Staff Engineer: schedule Product alignment meeting within 24 hours and update schema.sql with any collected product attributes.
2. Release Engineer: prepare Postgres-based CI job template that runs migrations and integration tests.
3. Backend Engineer: prepare PR updating prisma/schema.prisma to match schema.sql and include migration files.

Acceptance Criteria (locked)
---------------------------
- Migrations present in repo and apply cleanly in CI against Postgres.
- Prisma schema matches schema.sql and generated SQL is semantically equivalent.
- Integration tests pass in CI and prove CRUD + audit flows.
- Runbook with backup/restore steps exists and has been rehearsed on staging.

Appendices
---------
- Reference: tasks/GSTA-7/schema.sql
