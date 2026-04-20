title: GSTA-42 — Write Database Migration and Seed Data Operations Guide
assignee: CTO
priority: medium

Summary
-------
- Deliver a locked, operational migration + seeding execution plan for moving from file-backed seeds (data/ai_tools.json) to a Postgres-backed tools table. The output must be an executable runbook, idempotent seed scripts, CI validations, and a staged rollout plan.

Scope
-----
- Produce the migration runbook and seeding guide (docs/DB_MIGRATION_AND_SEEDING_GUIDE.md).
- Provide idempotent seed/backfill scripts (packages/backend/scripts/migrate_to_db.js exists; provide a Prisma-style seed where appropriate).
- Add CI job(s) that validate migrations run against ephemeral Postgres and execute integration smoke tests.
- Provide a canary/staging migration plan and rollback rehearsal notes.

Acceptance criteria
-------------------
1. docs/DB_MIGRATION_AND_SEEDING_GUIDE.md exists, reviewed, and accepted by Release Engineer and QA.
2. Idempotent seed/backfill script(s) are present in packages/backend/scripts and documented (one Postgres/pg script and one Prisma seed if the codebase uses Prisma).
3. CI has a job that applies migrations in an ephemeral Postgres and runs integration smoke tests (PRs must fail when migrations do not apply cleanly).
4. A staging canary migration has been executed and verified with smoke tests and performance observations recorded.
5. Rollback rehearsal (restore from backup) succeeded on staging.
