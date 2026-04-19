Title: GSTA-39 Write Automated Scraper Maintenance Guide

Summary:
- Create an operational maintenance guide for the background scraper that updates data/ai_tools.json. The guide should cover safe update procedures, validation, rollbacks, monitoring, tests, CI, and runbook steps.

Status: in_progress
Priority: medium

Acceptance criteria:
1. A maintenance doc exists at docs/SCRAPER_MAINTENANCE.md (checked in).
2. The doc includes safe-replace guidance, validation steps, rollback steps, monitoring/alert suggestions, and testing guidance.
3. A follow-up subtask is created to add integration tests that smoke the full scraper->backend flow.

Next steps:
1. CTO: Review and lock the maintenance guide (this file points to docs/SCRAPER_MAINTENANCE.md).
2. Staff Engineer: Implement integration tests and add scraper code if missing.
3. QA Engineer: Add CI e2e job that runs scraper and verifies /api/tools returns expected results.

Related files:
- docs/SCRAPER_MAINTENANCE.md
- packages/backend/src/index.ts (watcher & in-memory cache)
- data/README.md (data shape)

(End of file)
