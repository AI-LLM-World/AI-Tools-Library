title: GSTA-11.1 — Backend - Search API
assignee: staff-engineer
priority: high
estimate: 2.5d
status: todo

Description
-----------
Implement the /api/tools search endpoint with support for full-text query (q), category, tags, sort, and cursor-based pagination.

Tasks
- Add route handler and request validation
- Implement query translator that builds parameterized SQL using Postgres full-text search (tsvector) and trigram fallback for short queries
- Add unit tests for translator edge cases and malicious input
- Add integration tests against a seeded test DB (sqlite for CI, Postgres for integration)
- Add metrics (latency, errors, cache hits)

Acceptance Criteria
- Endpoint responds correctly for combinations of q/tags/category/sort
- Unit tests cover translator with >=90% coverage
- Integration tests run in CI
