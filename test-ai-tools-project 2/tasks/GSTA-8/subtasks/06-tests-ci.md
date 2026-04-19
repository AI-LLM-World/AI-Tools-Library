title: GSTA-8.6 — Tests: unit + integration + e2e
assignee: qa-engineer
priority: high
estimate: 2d
status: todo

Description
-----------
Add test suite and CI integration.

Tasks
- Add unit tests for validation and auth helpers.
- Add integration tests using SQLite in-memory and Prisma migrations.
- Add e2e tests for the resource create/list flows.
- Add CI job to run tests on PRs.

Acceptance Criteria
- CI runs tests and passes on PRs.
