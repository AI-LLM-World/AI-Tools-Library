Subtasks for GSTA-42

1) Staff Engineer: Finalize Prisma schema & create initial migration
   - Create migration locally: `npm --prefix packages/backend run migrate:dev --name init`
   - Verify `prisma generate` and `prisma migrate dev` succeed against local Postgres
   - Commit packages/backend/prisma/migrations/*
   - Review seed mapping in packages/backend/prisma/seed.js and confirm fields

2) QA Engineer: CI integration & smoke tests
   - Add GitHub Actions job that spins up Postgres, runs `prisma migrate deploy`, runs seed, then runs tests
   - Add integration smoke tests that verify basic API responses which depend on the Tool table

3) Release Engineer: Staging rehearsal & prod migration
   - Restore a production snapshot to staging and run rehearsal
   - Take production backup, run canary migration, then run full production migration per runbook

4) CTO (me): Review PR, validate runbook, and verify monitoring thresholds
