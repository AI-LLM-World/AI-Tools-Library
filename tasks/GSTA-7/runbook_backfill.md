Runbook & backfill checklist — GSTA-7

Pre-migration checklist
-----------------------
1. Ensure a full backup is taken (physical or logical) and validated.
2. Run migrations on staging that mirrors production size; capture runtime and resource usage.
3. Verify migrations are additive where possible. For destructive changes prepare 2-step plan.
4. Ensure Release Engineer and DBA are on-call during migration window.

Migration steps
---------------
1. Put maintenance banner if API behaviour may be inconsistent during schema evolution.
2. Run migration up script (Flyway/V1__create_schema.sql) on a canary DB or canary tenant.
3. Monitor DB metrics (locks, long-running queries, replication lag) and application errors.
4. Run smoke tests to ensure basic flows succeed.

Backfill strategy
------------------
- Perform backfills in small batches with idempotent scripts. Use OFFSET/LIMIT or keyset pagination.
- Use an instrumented background job that can resume on failure and log progress checkpoints.

Rollback strategy
------------------
- If migration fails catastrophically, restore from backup to a recovery cluster and cutover traffic to recovery.
- For additive changes, rollback may be safe by removing columns in a later release after ensuring no live writes occur.

Post-migration verification
---------------------------
1. Run integration tests (CRUD flows) against production snapshot or canary tenant.
2. Verify audit logs were written for any important lifecycle events.
3. Monitor application logs for errors related to DB schema (missing columns, cast errors).

Notes
-----
- For large organizations with many resources, prioritize partitioning and batched backfills.
- Ensure any sensitive data written to audit_logs is redacted per compliance rules.
