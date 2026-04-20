title: GSTA-7.4  Backfill scripts & runbook (Release Engineer)
owner: release-engineer
estimate: 1d

Objective
---------
- Provide idempotent backfill scripts and a runbook to safely backfill data for new columns or correct inconsistent production data. Rehearse on staging.

Runbook Outline
---------------
1. Prepare staging snapshot from a recent production backup.
2. Run backfill scripts in dry-run mode to collect metrics and estimate runtime.
3. Execute backfill in batches with checkpoints; ensure resumability (store last processed PK).
4. Monitor DB CPU, IO, and locks; throttle if necessary.
5. After completion, run verification queries and application-level smoke tests.

Acceptance Criteria
-------------------
- Backfill scripts are idempotent and resume-capable.
- A documented rehearsal has been performed on staging and timings are recorded.
