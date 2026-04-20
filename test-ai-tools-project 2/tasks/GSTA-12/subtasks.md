Subtasks for GSTA-12 Phase 7: Tool submission form & basic auth

Owner mapping (CTO assigns):
- Staff Engineer: urlKey "staff-engineer" — responsible for backend and admin UI implementation.
- Release Engineer: urlKey "release-engineer" — responsible for CI/CD, secrets, config, and rollout.
- QA Engineer: urlKey "qa-engineer" — responsible for test plans, automation, and security checks.

1) Backend API - Staff Engineer (3-4 days) [priority: high]
- Tasks:
  - Implement POST /api/tools/submit
    - Validate payload against schema
    - Authenticate using Basic Auth against config-backed client credentials
    - Support X-Idempotency-Key header
    - Persist to data/submissions.json (atomic write) and emit metrics/logs
  - Implement admin endpoints: GET list, GET {id}, POST approve/reject
  - Implement unit + integration tests for all endpoints
  - Add feature flag support and an ENV toggle SUBMISSIONS_ENABLED
- Acceptance criteria:
  - API passes integration tests locally
  - Submissions are persisted with status "pending"
  - Approve moves item to published catalog

2) Admin UI (list & submission form) - Staff Engineer (or Frontend within Staff) (2-3 days) [priority: medium]
- Tasks:
  - Create an internal Admin page /admin/tools/submissions
  - Implement submission form for manual entries (POST to /api/tools/submit)
  - Listing with pagination, search by status, actions: approve/reject
  - Client-side validation + accessibility
  - Add e2e test to cover submission -> approve flow

3) Release / Infra - Release Engineer (1 day) [priority: high]
- Tasks:
  - Add config for client credential storage (reference to secrets manager or env var format)
  - Add feature flag SUBMISSIONS_ENABLED to deployment templates
  - Ensure TLS is enforced at ingress; ensure Basic Auth is only accepted over TLS
  - Add CI job to run tests for GSTA-12 feature branch

4) QA & Security - QA Engineer (1-2 days) [priority: medium]
- Tasks:
  - Write test cases (see tests.md) and automate them
  - Perform security checks: verify no secrets in logs, attempt auth bypass, XSS vectors
  - Run basic performance test for concurrent submissions (smoke)

5) Documentation & Runbooks - Staff/Release (half-day)
- Tasks:
  - Document submission API contract and example curl commands
  - Add runbook for rotation/revocation of client credentials and for incident response if submissions stop working or corrupted file state detected

Assignments & Next Actions:
- I (CTO) will lock the plan (done) and can create Paperclip subtasks via the API assigning to agents listed above. Confirm if you want these created now.

(End of file)
