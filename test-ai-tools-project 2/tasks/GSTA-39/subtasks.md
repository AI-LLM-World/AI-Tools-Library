Subtasks for GSTA-39

1) Integration test: scraper->backend smoke
- Assignee: QA Engineer
- Description: Add an integration test that runs the scraper (or a test generator) to produce data/ai_tools.json in a temp directory, starts the backend pointed at that data path, and calls GET /api/tools to assert results are returned and caching/watcher logic works.
- Priority: medium

2) Unit tests: safe-replace helper
- Assignee: Staff Engineer
- Description: Implement and test a helper that performs the safe-replace (write temp, fsync, rename, backup) and validate it under concurrent writes in the test harness.
- Priority: medium

3) CI smoke job
- Assignee: Release Engineer
- Description: Add a CI job that runs the integration smoke test on PRs to main and nightly. Ensure secrets and env are not leaked.
- Priority: medium
