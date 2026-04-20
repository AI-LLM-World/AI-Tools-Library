Subtasks for GSTA-42
--------------------

1) Draft and finalise runbook (Owner: Release Engineer) — 1d
   - Review docs/DB_MIGRATION_AND_SEEDING_GUIDE.md, add any infra-specific steps (backup commands, snapshot IDs, PM approval windows).

2) Provide Prisma idempotent seed (Owner: Staff Engineer) — 0.5d
   - Create packages/backend/prisma/seed.js or packages/backend/scripts/seed_prisma.js using prisma client upsert semantics. Ensure idempotence.

3) Validate existing PG backfill (Owner: Staff Engineer) — 0.5d
   - Review packages/backend/scripts/migrate_to_db.js and harden error handling and batch sizes. Add logging and dry-run mode.

4) CI job to validate migrations (Owner: QA Engineer) — 1d
   - Add GitHub Actions job that brings up Postgres service, runs `npx prisma migrate deploy`, then runs integration tests.

5) Staging canary migration and rollback rehearsal (Owner: Release Engineer + QA) — 1d
   - Run migration on a staging DB restored from production snapshot. Execute smoke tests and perform a backup restore rehearsal.
