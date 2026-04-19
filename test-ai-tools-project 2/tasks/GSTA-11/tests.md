Test Plan - GSTA-11

Unit Tests
- Query translator: mapping client filters to SQL fragments
- Validation: reject malformed filters and oversized page sizes

Integration Tests
- Run search queries against a seeded sqlite/postgres test DB
- Verify correctness for combinations of filters and sorts

E2E Tests
- Frontend flows: type query, apply filters, paginate, sort

Performance Tests
- Generate 1M item rows and run representative queries measuring P95 latency

Acceptance Criteria
- Functional parity with product requirements
- P95 latency under 300ms on test infra for target dataset
- 90% test coverage for translator and API
