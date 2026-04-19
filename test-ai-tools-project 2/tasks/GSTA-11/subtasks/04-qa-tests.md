title: GSTA-11.4 — QA - Test Matrix & Performance Tests
assignee: qa-engineer
priority: high
estimate: 2d
status: todo

Description
-----------
Create the test matrix and run performance tests for the search functionality. Validate correctness and performance targets.

Tasks
- Create unit/integration/E2E test cases covering edge cases (empty q, many tags, long q, invalid params)
- Performance harness: seed 1M rows and run representative queries (measure p50/p95/p99)
- Validate P95 < 300ms on staging infra; if not, produce recommendations and tickets

Acceptance Criteria
- Test matrix checked into tasks/GSTA-11/tests.md
- Performance report with graphs and identified bottlenecks
