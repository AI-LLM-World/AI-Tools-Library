title: GSTA-118.3  QA Engineer (tests & runbook rehearsal)
owner: qa-engineer
estimate: 1.5d

Objective
---------
- Provide test coverage and verification for Website v1 and rehearse runbook steps for migrations and backfills where relevant.

Deliverables
------------
1. Test harness and E2E smoke tests: submit -> approve -> published.
2. Integration test cases for storage error conditions (disk full, write failure), idempotency, and concurrency.
3. Rehearsal report for migration runbook (coordinate with Release Engineer and GSTA-7 owners).

Checklist
---------
- [ ] Implement e2e smoke that runs in CI (headless): catalog list, search, submit flow, admin approve, verify published.
- [ ] Add integration tests for data/submissions.json atomic write: simulate failures and ensure no corruption.
- [ ] Run migration rehearsal on staging with GSTA-7 team and capture any blockers.
- [ ] Verify XSS sanitization by asserting malicious payloads are escaped on render.

Notes
-----
- Focus on critical-path tests first. Heavy perf tests are out-of-scope for the 1-week fast path but a small smoke performance test (100 concurrent reads) should be included.
