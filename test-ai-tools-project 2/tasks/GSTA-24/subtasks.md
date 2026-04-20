Subtasks for GSTA-24: Test strategy and implementation

Priority: High tasks first

1) Implement storage helpers and validation (Staff Engineer)
   - Create modular helpers: atomicWrite, readSubmissions, appendSubmission
   - Add JSON Schema/Zod validation for submission payload
   - Add unit tests for helpers and validation
   - Estimate: 2 days

2) Implement POST /api/tools/submit and idempotency (Staff Engineer)
   - Implement Basic Auth check for programmatic clients (use test fixtures for creds)
   - Support X-Idempotency-Key and persist mapping
   - Return appropriate HTTP codes (201, 400, 401, 409)
   - Add unit + integration tests
   - Estimate: 2 days

3) Admin endpoints and approval flow (Staff Engineer)
   - GET /api/admin/submissions (list)
   - GET /api/admin/submissions/{id}
   - POST /api/admin/submissions/{id}/approve
   - POST /api/admin/submissions/{id}/reject
   - Implement audit event emission
   - Add integration tests (approve/reject)
   - Estimate: 2 days

4) Frontend Admin UI skeleton for submission review (Staff Engineer)
   - Add /admin/tools/submissions page for listing and approve/reject actions (simple UI)
   - Reuse existing frontend patterns
   - Add e2e Playwright tests to exercise UI flows
   - Estimate: 2 days

5) Unit & Integration tests coverage expansion (QA Engineer)
   - Add tests described in tests.md
   - Ensure coverage >= 90% for backend submission/admin paths
   - Estimate: 2 days

6) E2E tests (QA Engineer)
   - Implement Playwright tests for submit->approve->publish
   - Implement security e2e for XSS rendering checks
   - Estimate: 2 days

7) CI integration and smoke tests (Release Engineer)
   - Add .github workflow that runs unit/integration and an isolated smoke test that runs submit->approve->verify
   - Add job to run perf smoke (concurrent submissions) optionally on nightly runs
   - Estimate: 1 day

8) Performance and resilience testing (Release / QA)
   - Create k6 or node script to simulate concurrent submissions and report failures
   - Run and document results; verify no corruption
   - Estimate: 1 day

9) Security review and test sweep (QA / Security)
   - Run targeted security tests (XSS, auth bypass)
   - Prepare remediation tickets if issues found
   - Estimate: 1 day

10) Runbook & Operational docs (Release Engineer)
    - Add runbook for corrupted submissions.json, secret rotation, and emergency rollback
    - Estimate: 0.5 day

11) Create Paperclip subtasks (CTO)
    - Run scripts/create_subtasks_gsta24.js with PAPERCLIP_* env vars to create tickets and assign agents
    - Estimate: 0.25 day

Notes:
- Tasks are written to be minimal and focused. Staff Engineer should pair with QA for test harness design to avoid rework.
- If a Postgres migration is done early, adapt storage tasks to add DB fixtures and migration tests instead of file-backed tests.

(End of file)
