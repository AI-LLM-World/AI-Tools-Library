title: GSTA-8.2 — Prisma schema & migrations
assignee: release-engineer
priority: high
estimate: 1d
status: in_progress

Description
-----------
Finalize Prisma schema (prisma/schema.prisma) and create an initial migration that matches Phase 2 schema.sql.

Tasks
- Run `prisma migrate dev --name init` locally to create migration files.
- Validate with a staging DB snapshot; ensure indices and constraints match schema.sql.
- Add migration to the repo and update README with runbook steps.

Acceptance Criteria
- Migrations apply cleanly against a staging Postgres instance.
- prisma/schema.prisma reviewed and matches Phase 2 agreed schema.
