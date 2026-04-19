Title: GSTA-53 Build Regular Scraper System: architecture analysis, scrapers, Docker DB, and tests

Owner: CTO (design), Staff Engineer (implementation), Release Engineer (CI), QA Engineer (tests)

Summary
- Implement a robust scraper runner that writes data/ai_tools.json atomically, provides validation and backups, and has integration tests and CI coverage. Deliver a locked execution plan and runbook.

Acceptance Criteria
1. packages/scraper exists with runner, safe-replace, validator, example scraper, and integration test.
2. Integration test passes in CI for PRs and pushes.
3. SCRAPER_EXECUTION_PLAN.md exists and is reviewed/locked by CTO.
4. A documented operational runbook and rollback steps are present (docs/SCRAPER_MAINTENANCE.md)
5. Dockerfile exists for building scraper image.

Out of scope
- Multi-writer distributed leader election (phase 2)
- Metrics HTTP endpoint (phase 2)

Risks
- If the scraper is misconfigured, backend cache may not update; mitigations: validation, backup, monitoring.
