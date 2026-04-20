Technical Plan — GSTA-42
-----------------------

Goal
----
Produce a concise, operational migration + seed runbook and deliver artifacts (scripts, CI jobs, and canary run) so the team can migrate from data/ai_tools.json to a Postgres `tools` table safely.

Architecture & Data Flow
------------------------
1. Source of truth today: data/ai_tools.json (file-backed)
2. Target: Postgres `tools` table with columns: id (uuid/text), name, category, short_description, website, tags (text[]), example_use, published_at, created_at
3. Migration path:
   - Add schema migration files under prisma/migrations or SQL files under a migrations folder.
   - Provide a backfill script that reads data/ai_tools.json and upserts into Postgres (idempotent). A Node/pg script (exists) or Prisma seed script should be provided.
   - Update backend to read from Postgres and keep file loader as a fallback if a feature flag is set.

State transitions
-----------------
- File-backed -> Backfill -> Database-backed (dual-read period optional) -> Full DB read & write

Failure modes and mitigations
----------------------------
- Partial backfill: use idempotent upserts and batch logging. If interrupted, resume from last processed id or re-run full upsert (ON CONFLICT DO NOTHING) after fix.
- Constraint violations: validate data locally before writing; add small repair steps in backfill.
- Performance: run backfill in batches (100-1000 rows) and monitor DB load; run during low traffic or use canary tenant.

Test coverage
-------------
- Unit tests: verify seed helper upsert logic and batch handling.
- Integration tests (CI): apply migrations in ephemeral Postgres and run API smoke tests.
- Staging rehearsal: run full migration against production-sized staging snapshot and verify correctness and performance.

Rollout plan
------------
1. Merge migration files and seed scripts into a feature branch.
2. Run CI job that applies migrations to ephemeral Postgres and runs tests.
3. Restore production snapshot into staging and run the migration; run smoke tests and performance monitoring.
4. Schedule production migration window, take final backup, run migration, execute smoke tests, and observe metrics.

Acceptance criteria
-------------------
- All items in tasks/GSTA-42/subtasks.md completed and verified.
