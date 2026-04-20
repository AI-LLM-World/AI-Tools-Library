Technical Execution Plan - GSTA-24: Test Strategy & Tasks for AI Tool Library

1. Goal
- Provide a locked technical execution plan to test and verify the AI Tool Library (public listing + submission/review paths). Deliver a clear set of subtasks and test artifacts so implementation, QA, and release teams can move forward with minimal ambiguity.

2. Scope and System Boundaries
- Frontend: public listing (packages/frontend) + Admin submission UI (internal).
- Backend API: existing read-only /api/tools and the new submission/admin endpoints (Phase 7 endpoints: POST /api/tools/submit, GET /api/tools/submissions, POST /api/tools/submissions/{id}/approve|reject).
- Storage:
  - Phase 1/7: file-backed seeds (data/ai_tools.json) and submissions store (data/submissions.json).
  - Long-term: Postgres (tools table, submissions table) behind CI/test migrations.

3. Deliverables
- Locked technical plan (this file)
- Test matrix and tests (unit, integration, e2e, security, perf)
- Subtasks for staff/qa/release with estimates and priorities
- Helper scripts for CI and local test harness

4. API Contracts (for tests)
- POST /api/tools/submit
  - Auth: Basic <base64(client_id:client_secret)>
  - Headers: X-Idempotency-Key (optional)
  - Body: submission object (see schema below)
  - Responses: 201 Created {id,status:pending} | 400 | 401 | 409 | 429

- GET /api/admin/submissions?status=pending&page=1&limit=20
  - Auth: admin session/SSO (in tests use test admin header or bypass flag)

- GET /api/admin/submissions/{id}
- POST /api/admin/submissions/{id}/approve
- POST /api/admin/submissions/{id}/reject {reason}

5. Data Models (test-friendly schema)
- Submission object (JSON):
  {
    "id": "slug-or-uuid",
    "name": "Tool Name",
    "category": "NLP|Vision|...",
    "short_description": "...",
    "website": "https://...",
    "tags": ["x","y"],
    "example_use": "...",
    "contact_email": "...",
    "submitted_at": "2026-04-19T...Z",
    "submitted_by": "client_id",
    "status": "pending|approved|rejected",
    "rejection_reason": "...",
    "metadata": {"user_agent":"...","ip":"..."}
  }

6. Storage Strategy & Test Harness
- Phase 7 (file-backed, used for early verification): implement a storage helper used by the backend that provides:
  - atomicWrite(submissionsPath, records): write to temp file, validate, then rename/replace submissions.json atomically. On Windows use fs.rename / replace semantics and validate final JSON after rename.
  - optimistic concurrency handling / simple process mutex for single-writer guarantee (use in-process mutex for tests; for production move to DB).
  - idempotency store: store X-Idempotency-Key => submission id mapping in submissions metadata. Tests will verify idempotency behaviour.

- Long-term: Postgres migrations and test fixtures. CI will run migrations before integration/e2e test jobs.

7. Validation & Sanitization (required tests)
- Use Zod (recommended) or Joi to validate incoming payloads in unit/integration tests.
- Tests must assert invalid sites are rejected: non-HTTPS websites, non-slug ids, oversized descriptions (>2000 chars), tags not array, XSS payloads in description.

8. Authentication & Secrets (tests and sim)
- Tests must cover Basic Auth success and failure cases, including rotated/revoked creds.
- For CI and local tests provide a test credentials fixture injected via env var.

9. Idempotency and Duplicate Handling (test cases)
- If X-Idempotency-Key is provided and identical, POST must return the original 201 result (or the same id) without creating duplicates.
- If a client resubmits same id without idempotency key: return 409 unless ?overwrite=true and client has higher authorization (out of scope; tests should assert 409). Include tests for overwrite param (if implemented).

10. Observability & Audit (testable expectations)
- Emit structured logs for events: submission_received, submission_validated, submission_persisted, submission_approved, submission_rejected.
- Tests will assert that the audit entry is recorded (for file-based audit, verify file contains entry; for DB, verify table row).

11. Failure Modes & Test Scenarios
- Disk full / write fails: simulate write errors and assert 500 response and no partial file replacement.
- Partial write / corrupted JSON: ensure atomic write semantics prevent replacing the main file with invalid JSON. Tests will create a temp invalid file and attempt to simulate a crash during write.
- Concurrent submissions: spawn N concurrent requests (N = 100 in perf test) and assert submissions.json remains valid and number of records equals submissions attempted (or expected deduplicated count when id conflicts occur).

12. Security & Trust Boundaries (test cases)
- XSS: submit malicious HTML in short_description and example_use; verify admin UI escapes when rendering and API stores raw text (or strips) per policy.
- Auth bypass: attempt Basic Auth credentials for admin endpoints and assert failure.
- Rate limiting: simulate basic rate-limiting tests (e.g., exceed per-client quotas) and observe 429 responses (if implemented). At minimum assert the API can be configured to return 429 under test harness.

13. Test Tools & Frameworks
- Unit/Integration: Jest + Supertest (Node) for backend endpoints and helpers.
- E2E: Playwright (headless) to exercise Admin UI + frontend (submit->approve->publish flow). Use fixtures and test admin credentials.
- Perf: k6 for load scenarios OR node-based script using Promise.all for basic stress tests in CI.
- Security: a small set of targeted tests (XSS vectors, header manipulation). For more, consider running OWASP ZAP later.

14. CI Integration
- Add a new CI workflow .github/workflows/ci-tools.yml to run:
  - Checkout + install
  - Run backend unit tests (fast)
  - Start backend server (dev mode) and run integration tests (Supertest or HTTP calls)
  - Run e2e Playwright tests in a job gated behind a feature-flag label (optional) or run in a separate job that can be skipped in PRs but run on main branch.
  - Run a smoke test job that calls POST /api/tools/submit -> admin approve script -> GET /api/tools and assert presence. This job uses ephemeral test data directory (TMP) to avoid mutating repo data files.

15. Test Coverage Targets
- Backend: >= 90% coverage for submission and admin paths. Unit tests for schema validation and storage helpers should be exhaustive.
- E2E: Acceptance tests covering happy path and key failure modes (idempotency, auth, XSS sanitization).

16. Acceptance Criteria (technical)
- Unit and integration tests pass in CI with coverage thresholds enforced.
- E2E happy path (submit -> approve -> published) passes in CI smoke tests.
- Performance smoke: concurrent submissions test completes without corrupting submissions.json in the file-backed harness.
- Runbook exists for corrupted storage and secret rotation.

17. Estimates
- Planning / specification: 0.5 days (this doc)
- Backend endpoints + storage helpers: 3 days
- Validation + security checks: 1 day
- Admin UI skeleton + approve/reject endpoints: 2 days
- Unit + integration tests: 2 days
- E2E test implementation: 2 days
- CI, perf tests, runbooks: 1-2 days

18. Next Steps (immediate)
1. Lock this technical plan (done)
2. Create subtasks (see subtasks.md) and assign to staff/qa/release
3. Implement storage helpers and unit tests first, then API endpoints, then admin UI and e2e
4. Add CI workflow and run smoke tests

(End of file)
