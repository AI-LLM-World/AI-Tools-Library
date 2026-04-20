Subtasks for GSTA-11

1) Backend - Search API (assignee: staff-engineer)
- Implement /api/search endpoint
- Query parsing and validation
- Query translation to parameterized SQL with FTS
- Pagination, sorting, and filter handling
- Unit and integration tests

2) Backend - DB Migrations & Indexes (assignee: release-engineer)
- Add FTS tsvector column and trigram extension if needed
- Create indexes for filter fields
- Migration scripts and rollback

3) Frontend - Search UI (assignee: staff-engineer)
- Search input with debouncing
- Filter controls (multi-select, ranges)
- Accessibility and responsive layout
- E2E tests

4) QA - Test Matrix & Performance Tests (assignee: qa-engineer)
- Create test cases for correctness and edge cases
- Run performance tests with seeded large dataset

5) Observability & Monitoring (assignee: release-engineer)
- Add metrics for latency, query counts, cache hit rate
