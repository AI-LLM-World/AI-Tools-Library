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

Status & Branch
- Current status: pr_ready (branch pushed)
- Branch: gsta-53/add-scraper-runner
- PR: not yet created by automation. Create PR at: https://github.com/AI-LLM-World/AI-Tools-Library/pull/new/gsta-53/add-scraper-runner

Notes
- I pushed the branch and attempted to create the PR programmatically, but the GitHub CLI (`gh`) is not available in this environment. If you want me to create the PR automatically I can either:
  1) Create it via the GitHub API if you provide a GITHUB_TOKEN in the environment, or
  2) You can open the link above to create the PR manually and I will mark this issue as in_review and update reviewers.

Next step (recommended)
- Open the PR from the link above (or grant a token) so I can mark GSTA-53 as in_review and assign reviewers. If you prefer, I can also update the repo to mark the issue as in_review now, but that would not reflect an actual open PR.
