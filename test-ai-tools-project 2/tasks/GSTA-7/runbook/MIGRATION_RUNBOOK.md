Migration Runbook  Phase 2 (GSTA-7)
=====================================

Pre-migration checklist
------------------------
1. Confirm schema SQL and migrations are in the repo. Link: tasks/GSTA-7/schema.sql
2. Take a full backup of the target DB:
   - For Postgres: `pg_dump -Fc --no-acl --no-owner -h <host> -U <user> <db> > backup_before_gsta7.dump`
3. Ensure CI migration job has been run successfully against a staging snapshot.
4. Identify canary tenants and their backup snapshots.

Migration steps (basic)
-----------------------
1. Put maintenance page on the application if schema changes may disrupt reads/writes.
2. Apply migrations on a single canary DB or tenant using the release migration role:
   - `psql <database> -f packages/backend/prisma/migrations/V1__create_schema.sql` (or `prisma migrate deploy`)
3. Verify migration applied:
   - `SELECT count(*) FROM information_schema.tables WHERE table_schema='public';`
   - Run smoke API tests against the canary tenant.
4. If backfills are required, run backfill scripts in batches (see tasks/GSTA-7/subtasks/04-backfill-runbook.md).

Rollback plan
-------------
- If migration fails during apply, stop and do not run further migrations. Investigate error, fix migration script, and retry on canary.
- If migration causes data corruption in prod: restore from backup into a staging cluster and investigate. Use `pg_restore -d <db>`.

Post-migration verification
--------------------------
1. Run integration tests (CI) against the migrated DB.
2. Verify key metrics: query latency, error rate, CPU, locks.
3. Verify audit logs: sample resource create/update and ensure audit entries exist.

Emergency rollback (if necessary)
--------------------------------
1. Take a snapshot of the current (broken) DB for debugging.
2. Restore the pre-migration backup to a new DB and switch application traffic to the restored DB once validated.

Notes
-----
- For large tables, prefer background backfills and `CREATE INDEX CONCURRENTLY` to avoid long locks.
- Always rehearse the full runbook on staging before production run.
