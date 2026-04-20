Database Migration and Seed Data Operations Guide

Purpose
- Provide a single reference for engineers and Release/QA on how to run migrations, seed data, test migrations, and handle common failure modes for this repository.

Scope
- Applies to local development, CI, staging, and production workflows that touch the database schema or seed data. The project uses Prisma as the ORM and Postgres in production. Local/dev may use SQLite for fast iteration.

Quick links
- Prisma schema: packages/backend/prisma/schema.prisma
- Local Docker Postgres: docker-compose.yml (project root)
- Seed file: data/ai_tools.json

Principles
- Prefer additive migrations. For destructive changes use a 2-step migration: (A) add new column + backfill, (B) switch reads/writes, (C) drop old column in a later release.
- Test migrations end-to-end in CI and on a staging DB before production.
- Take backups before any production migration and verify restore on a staging cluster.

Common Commands
- Install Prisma client (if required):
  - cd packages/backend
  - npm ci

- Generate Prisma client (after editing schema):
  - npm --prefix packages/backend run prisma -- generate

- Create migration (dev):
  - npm --prefix packages/backend run prisma -- migrate dev --name descriptive_name

- Apply migrations (non-interactive, CI/staging/prod):
  - npm --prefix packages/backend run prisma -- migrate deploy

- Reset local DB and reapply migrations (dangerous - local/dev only):
  - npm --prefix packages/backend run prisma -- migrate reset --force

- Seed data (file-backed -> DB):
  - The repo ships with data/ai_tools.json which is used as a development seed. For DB-backed seeds, convert this to a JS/TS or SQL seeder that inserts into the tools table and run it after migrations.
  - Example pattern (Node):
    - node packages/backend/prisma/seed.js

Notes about packages/backend/package.json
- The repository now includes helpful scripts in packages/backend/package.json:
  - `prisma:generate` - generate Prisma client
  - `migrate:dev` - convenience for creating/applying local migrations
  - `migrate:deploy` - non-interactive migration deploy for CI/staging/prod
  - `seed` - run the seeder at packages/backend/prisma/seed.js
  - Ensure you run `npm --prefix packages/backend ci` to install dependencies before running these scripts.

Seed Strategy Recommendation
- Short term: add a Prisma/SQL seeder that reads data/ai_tools.json and inserts into `tools` table during local setup and CI. Keep file-backed seed as canonical source of truth for sample data.
- Long term: retire file-backed seeds and use a dedicated seed table or fixtures managed by the release process.

Failure Modes & Recovery
- Migration fails during apply on production:
  1. Stop the migration window and assess logs.
  2. If migration is additive and partially applied, deploy application that is tolerant (reads/writes both schema versions) and backfill missing data if needed.
  3. If destructive and rollback required, restore from backup to a recovery cluster and cutover traffic to recovery while debugging.

- Long-running backfills lock tables or cause excessive IO:
  - Use batching and background jobs. Prefer updating in small transactions with indexed predicates. Schedule during low traffic windows.

- Seed runner fails with validation errors:
  - Fail early in CI. Add schema validation in the seeder and ensure seed data conforms to Prisma schema.

Testing & CI
- Migration tests (recommended matrix):
  1. Unit: small test for migration helper functions (if any).
  2. Integration: run full migrations in a fresh Postgres container, run seeds, and execute smoke tests (API handlers). Use GitHub Actions or the project's CI.
  3. Migration up/down: if using a migration tool that supports down, run up then down in CI to ensure reversibility (or test restore from backup path).
  4. Performance: run migrations against a staging snapshot where possible and measure runtime.

- Example GitHub Actions step (sketch):
  - name: Setup Postgres
    uses: harmonic/setup-postgres@v1
  - name: Run migrations
    run: npm --prefix packages/backend run prisma -- migrate deploy
  - name: Run seeds
    run: node packages/backend/prisma/seed.js

Operational Runbook (short)
1. Pre-migration
  - Notify stakeholders and schedule a maintenance window if needed.
  - Take a logical or physical backup of production DB.
  - Run migrations on staging mirrored DB and smoke test.

2. Migration
  - Run `prisma migrate deploy` with a migration role that has privilege to alter schema.
  - Monitor logs, slow queries, DB CPU, and error rates.

3. Post-migration
  - Run verification smoke tests and a subset of E2E tests.
  - If backfill required, run background job and monitor progress.

Appendix: Backfill Patterns
- Use a cursor-based batching loop to backfill large tables. Example pseudo:
  - while (true) { rows = select id from table where processed = false limit 1000; process(rows); if (rows.length < 1000) break }

Acceptance Criteria for this guide
- Engineers can run migrations locally and in CI using the documented commands.
- A seed runner (packages/backend/prisma/seed.js) exists and imports data/ai_tools.json into the DB for local/CI use.
- The runbook lists clear steps for backups and restores and points to the Release Engineer for production runs.

Owners
- Author: CTO (Release Engineer / Staff Eng for reviews)

Next Work Items
- Run initial migration locally and commit the generated SQL migration directory:
  1. npm --prefix packages/backend ci
  2. npm --prefix packages/backend run prisma:generate
  3. npm --prefix packages/backend run migrate:dev --name init
  4. Commit packages/backend/prisma/migrations/* to the repo

- Add CI job (GitHub Actions) that:
  1. Starts Postgres service
  2. Runs `prisma migrate deploy`
  3. Runs `node packages/backend/prisma/seed.js`
  4. Runs tests

- Staff Engineer: review schema.prisma and seed mappings, confirm tags field shape (Json vs String[]), and sign-off on production migration plan.

Locked Technical Execution Plan
--------------------------------
This section is the operational, ordered plan for executing schema migrations and seed data deployment for Phase 1. It is intentionally prescriptive so Release and QA can follow it without ambiguity.

Migration States
- PREPARATION: code + migration authored, staging rehearsal ready
- STAGING_REHEARSAL: run migration + seed on staging snapshot; run smoke & perf tests
- CANARY: run migration on a small production-like shard/canary tenant (if available)
- PRODUCTION_MIGRATION: apply migration to production, start backfills
- MONITORING: validate correctness and performance; observe for regressions
- COMPLETE: migration accepted and cleanup scheduled (drop old columns later)
- ROLLBACK: restore from backup if unrecoverable

Production Runbook (step-by-step)
1) PREP: prepare the release branch
   - Add migration file via `npm --prefix packages/backend run migrate:dev --name descriptive_name` on a dev machine against a local Postgres.
   - Ensure application code is backward-compatible (reads/writes both old and new columns) and protected by a feature flag if needed.
   - Create a checklist and notify stakeholders (Release Eng, Staff Eng, QA, SRE/on-call).

2) STAGING REHEARSAL
   - Restore a recent production snapshot to staging (or use a staging DB that mirrors production size).
   - Run `npm --prefix packages/backend run prisma -- migrate deploy` against staging.
   - Run `npm --prefix packages/backend run seed` if seed changes are part of the migration.
   - Execute smoke tests and targeted performance tests. Capture runtime, locks, and IO metrics.

3) BACKUP PRODUCTION
   - Take a logical backup using pg_dump:
     - pg_dump -h <host> -U <user> -Fc -f backup-$(date +%Y%m%d-%H%M).dump <dbname>
   - Verify backup by restoring to a recovery host (fast spot-check of critical tables):
     - pg_restore -h <host> -U <user> -d recovery_db -c backup.dump

4) CANARY (optional but recommended)
   - Apply migration to a canary tenant or a small subset of production traffic.
   - Run smoke tests and monitor error rates for 15-30 minutes.

5) PRODUCTION MIGRATION
   - Run `npm --prefix packages/backend run prisma -- migrate deploy` as Release Eng.
   - If backfill is required, start the backfill as a background job with batching (see Appendix Backfill Patterns).
   - Monitor application errors, DB locks, CPU, and slow queries.

6) POST-MIGRATION VERIFICATION
   - Run the verification checklist (below).
   - If all checks pass, mark migration COMPLETE and schedule the final cleanup migration (drop old columns) in a future release.

Backup & Restore Commands (quick reference)
- Backup (logical, compressed):
  - pg_dump -h $DB_HOST -U $DB_USER -Fc -f backup-YYYYMMDD.dump $DB_NAME
- Restore to DB (test restore):
  - createdb -h $RECOV_HOST -U $DB_USER $RECOV_DB
  - pg_restore -h $RECOV_HOST -U $DB_USER -d $RECOV_DB -c backup-YYYYMMDD.dump

Canary & Cutover Strategy
- Deploy app code that is compatible with both old/new schema first.
- Run migration in off-peak hours or maintenance window.
- Apply migration to canary tenant first, verify, then full production.
- If backfill is heavy, run it asynchronously with throttling and progress monitoring.

Monitoring & Verification Checklist (run after migration)
- Application-level:
  - Run smoke tests: public API endpoints that exercise new schema.
  - Sample queries: GET /api/tools, GET /api/tools/:id for a handful of IDs.
- DB-level:
  - SELECT COUNT(*) FROM "Tool"; ensure expected row count
  - Check for table locks: SELECT * FROM pg_locks WHERE locktype <> 'virtual';
  - Check long-running queries: SELECT pid, query, state, now() - query_start AS duration FROM pg_stat_activity WHERE state <> 'idle' ORDER BY duration DESC LIMIT 20;
- Metrics:
  - Error rate, 5xxs, latency percentiles (p95/p99) for dependent services.

Rollback / Decision Tree
- If migration fails with schema errors and cannot be fixed quickly -> ROLLBACK:
  1) Restore backup to recovery cluster.
  2) Point traffic to recovery cluster (DNS / load-balancer cutover depending on topology).
  3) Investigate, fix, rehearse against staging, then re-attempt migration.
- If migration is additive and only data backfill failing -> ROLLFORWARD:
  - Deploy code that tolerates both schemas, continue backfill in small batches.

Edge Cases & Remediations
- Unique constraint conflicts on upsert
  - Pre-scan staging for duplicates and prepare dedupe script.
- New NOT NULL column with no default
  - Backfill in a prior additive migration step before flipping application to require the column.
- Concurrent writes during migration
  - Deploy app changes that write both fields or route writes to a migration-safe path. Consider a short write lock window for specific critical tables.

Detailed Test Matrix
- Unit: seed mapping functions and small helpers (fast)
- Integration: run full prisma migration + seed against ephemeral Postgres container and run API smoke tests
- Migration Rehearsal: run migration against a production-size staging snapshot and measure runtime/IO and tail latency
- Backfill Perf: run the backfill script on a staging snapshot and measure throughput, lock contention, and failed batches
- Recovery: test restore from backup and run verification checks to ensure recovery plan works

Subtasks & Owners (recommended)
- Staff Engineer (owner = Staff Eng)
  - Review and finalize schema.prisma and seed mappings
  - Create and commit initial prisma migration files (est. 1d)
  - Acceptance: migration file(s) applied locally and staging rehearsal passes
- Release Engineer (owner = Release Eng)
  - Run staging rehearsal, take prod backup, run canary & production migration, execute cutover (est. 0.5-1d for small schema)
  - Acceptance: prod migration applied and monitoring shows no regressions after 1 hour
- QA Engineer (owner = QA)
  - Add CI job to run migrations + seeds + smoke tests, run staging smoke/perf tests, validate post-migration behaviour (est. 0.5d)

Estimated timeline
- Staff Eng: finalize schema + tests — 1 day
- Release Eng: staging rehearsal + prod migration — 0.5-1 day (depending on backfill)
- QA: CI changes + verification — 0.5 day

Change log
- Added a minimal Prisma schema and seeder. The next step is to generate and commit the migration files and wire CI to run migrations and seeds before tests.
