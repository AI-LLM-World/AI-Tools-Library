Test matrix and cases - GSTA-12 Phase 7

Overview:
- Owner: QA Engineer (primary), Staff Engineer (implement tests)
- Run tests in CI for feature branches and on merges to main when feature flag enabled.

Unit Tests (fast)
- Validation functions: Good/Bad payloads
- Auth helper: valid/invalid credentials
- Storage helper: atomic write, temp file creation, rollback on failure

Integration Tests (medium)
- POST /api/tools/submit
  - valid payload + valid Basic Auth -> 201 + pending
  - missing required field -> 400
  - invalid website (http) -> 400
  - invalid credentials -> 401
  - duplicate id -> 409
  - idempotency key repeated -> same response (idempotent)

- Admin flow:
  - GET pending list (requires admin session) -> returns new submission
  - POST approve -> submission moves to published catalog
  - POST reject -> status updated and rejection_reason stored

E2E Tests (slow)
- Browser submits form -> Admin approves -> Tool becomes visible in public listing (simulate by reading data/ai_tools.json)

Security Tests
- XSS injection attempt in short_description -> ensure sanitized when rendered
- Replay attack: submit same id with different payloads without idempotency key -> return 409
- Verify credentials rotation: revoked client cannot submit

Performance Tests (smoke)
- Simulate 100 concurrent submissions to ensure storage does not corrupt (use local harness or k6)

CI Integration
- Run unit + integration tests on PRs
- Run e2e + perf tests on gated release job or nightly

Test Data
- Provide fixture generator to create valid submission payloads; keep sample credentials for test environment only (store in CI secrets)

Reporting
- Failures must open an issue with logs and failing test names. Track test coverage for submission-related modules.

(End of file)
