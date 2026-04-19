Subtasks for GSTA-53

1) Implement scraper runner (packages/scraper)
   - Owner: Staff Engineer
   - Estimate: 2d
   - Acceptance: runner loads plugins, validates, and writes ai_tools.json atomically. Includes safeReplace and example plugin.

2) Integration tests and CI
   - Owner: QA Engineer
   - Estimate: 1d
   - Acceptance: packages/scraper/test/integration.js runs and passes in GitHub Actions on PRs.

3) Docker and release pipeline for scraper image
   - Owner: Release Engineer
   - Estimate: 1d
   - Acceptance: Dockerfile builds, image pushed to registry, CronJob manifest documented.

4) Operational docs and runbook
   - Owner: Staff Engineer
   - Estimate: 0.5d
   - Acceptance: SCRAPER_MAINTENANCE.md and SCRAPER_ARCHITECTURE.md reviewed and link from tasks.

5) E2E smoke test (optional)
   - Owner: QA Engineer
   - Estimate: 1d
   - Acceptance: Full smoke: run scraper -> start backend pointing at same data dir -> GET /api/tools returns expected results.
