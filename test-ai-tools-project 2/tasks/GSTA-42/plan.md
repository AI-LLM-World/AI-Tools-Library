GSTA-42: Database Migration and Seed Data Operations

Plan Owner: CTO

Goal
- Deliver a tested, repeatable migration and seed workflow for the AI tools catalog (data/ai_tools.json -> Tool table) with clear runbook, CI integration, and production migration plan.

Scope
- Implement Prisma schema and initial migration
- Add a robust seed runner for data/ai_tools.json
- Add CI job to run migrations + seeds before tests
- Provide a production runbook with backup & rollback guidance

Deliverables
1. prisma/schema.prisma (done)
2. packages/backend/prisma/migrations/* (initial migration) — Staff Eng to produce and commit
3. packages/backend/prisma/seed.js (done)
4. CI job template that runs migrations + seeds (QA to implement)
5. Runbook and acceptance checklist (docs/GSTA-42_DB_MIGRATION_SEED_GUIDE.md) (done)

Acceptance
- Migrations and seeds run in CI and pass smoke tests
- Staging rehearsal runs successfully and Release Eng signs off
- Production migration completed using runbook and monitoring
