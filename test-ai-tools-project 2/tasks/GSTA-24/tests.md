Test Matrix and Cases - GSTA-24

Overview
- This matrix groups tests by type and provides concrete cases that must be implemented as part of GSTA-24.

Unit Tests (fast, run on every PR)
- Validation
  - Accept valid submission payloads
  - Reject invalid ids, non-HTTPS website, empty required fields
  - Reject oversized text fields (> 2000 chars)
- Storage helpers
  - atomicWrite writes valid JSON and replaces target atomically
  - atomicWrite does not replace target on validation failure
  - idempotency mapping persisted on write
- Auth helpers
  - Basic Auth success for valid credentials
  - Basic Auth failure for wrong credentials

Integration Tests (run in CI job)
- POST /api/tools/submit
  - Happy path returns 201 and record in submissions store
  - Missing Basic Auth => 401
  - Duplicate id without X-Idempotency-Key => 409
  - X-Idempotency-Key repeated => idempotent response (201, same id)
- Admin endpoints
  - GET list returns pending submissions
  - POST approve moves entry to published store (ai_tools.json or DB)
  - POST reject updates status and stores rejection_reason
- Audit
  - Verify audit event written for approve/reject actions

E2E Tests (Playwright - run on main or nightly)
- Flow: Admin submits via form or API -> Approve in admin UI -> Public listing shows new tool
- Security e2e: submit XSS payload and verify admin UI escapes on render

Performance & Concurrency (smoke/perf job)
- Concurrent submissions test: N=100 concurrent POST /api/tools/submit (unique ids). Assert all created and file/db is valid.
- High contention test: N concurrent submissions with same id -> expect 1 created + proper conflict responses

Security Tests
- XSS payloads in text fields are sanitized/escaped as per policy (assert in UI and/or storage policy)
- Attempt admin endpoint access using Basic Auth client -> assert 403/401

Resilience Tests
- Simulate write error (mock fs to throw) and assert 500 response and submissions.json unchanged
- Partial write: simulate crash between temp write and rename; assert original file unchanged and server returns error

Observability Tests
- On submission and approval, verify that structured logs contain event name and submission id
- Metrics: submission_rate and submission_errors_by_type increment accordingly (unit testable by exposing metrics endpoint or in-memory counter)

Test Fixtures & Helpers
- Provide fixtures/submissions.sample.json with representative entries
- Provide a test helper to run the backend against a temporary data directory (uses process.env.TEST_DATA_DIR) to avoid touching repo files

How to run locally
1. Set TEST_DATA_DIR to a writable temp dir
2. Set TEST_BASIC_AUTH_CREDENTIALS in env for Basic Auth tests
3. npm --workspace=@gstack/backend run test:unit
4. npm --workspace=@gstack/backend run test:integration
5. npm --workspace=@gstack/frontend run test:e2e (requires Playwright)

(End of file)
