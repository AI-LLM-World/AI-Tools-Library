Technical Execution Plan - GSTA-12 Phase 7: Tool submission form & basic auth

1. Goal
- Provide a secure, auditable submission path for new AI tools. Support both programmatic submissions (Basic Auth clients) and an Admin-facing web form. Submissions must enter a review queue (pending) and require manual approval to become published.

2. Non-goals
- Public self-service publishing without review.
- Integrating third-party OAuth providers for submitters in Phase 7 (can be roadmap v2).

3. System Boundaries
- Frontend: Admin submission UI (internal, authenticated).
- API: Submission endpoints (POST /api/tools/submit, GET /api/tools/submissions, POST /api/tools/{id}/approve/reject).
- Auth: Basic Auth for programmatic clients; session/SSO for Admin UI (not implemented here).
- Storage: Short-term file-backed submissions store (data/submissions.json). Long-term: RDBMS with unique constraints and transactions.

4. High-level Architecture (components)
- Browser (Admin UI)  --->  Backend API  --->  Submissions Store (data/submissions.json / DB)
                                 |---> Audit Log
                                 |---> Metrics

Notes:
- All traffic must be TLS-terminated before reaching the app. Basic Auth must never be accepted over plain HTTP.

5. Data Model (submission object)
{
  "id": "slug-or-generated-uuid",    // required, slug preferred
  "name": "Tool Name",              // required
  "category": "NLP|Vision|...",     // required
  "short_description": "...",       // required
  "website": "https://...",         // optional but recommended
  "tags": ["tag1","tag2"],        // optional
  "example_use": "...",             // optional
  "contact_email": "...",           // optional
  "submitted_at": "2026-04-19T...Z",
  "submitted_by": "client_id|user_id",
  "status": "pending|approved|rejected",
  "rejection_reason": "...",
  "metadata": {"user_agent":"...","ip":"..."}
}

6. API Contract

POST /api/tools/submit
- Auth: Authorization: Basic <base64(client_id:client_secret)>
- Headers: X-Idempotency-Key (optional)
- Body: JSON matching submission schema (id optional - server may generate)
- Responses:
  - 201 Created {"id":"...","status":"pending"} + Location: /api/tools/submissions/{id}
  - 400 Validation error
  - 401 Unauthorized (invalid/missing credentials)
  - 409 Conflict (duplicate id without overwrite)
  - 429 Too Many Requests (rate limit)

GET /api/tools/submissions?status=pending   (admin)
GET /api/tools/submissions/{id}             (admin)
POST /api/tools/submissions/{id}/approve    (admin)
POST /api/tools/submissions/{id}/reject     (admin) {reason}

Admin endpoints must require admin session/SSO (out of scope for Basic Auth clients).

7. Authentication & Secret Management
- Client credentials: client_id + client_secret. Store secrets in environment variables or secrets manager (do not commit).
- Verify Basic Auth by comparing incoming credentials to stored hashed secrets (bcrypt/PBKDF2). If using simple config file for Phase 7, keep it outside repo and reference via env var pointing to secret store path.
- Rotate secrets by supporting multiple active credentials and using created_at/rotated_at metadata.

8. Validation & Sanitization
- Use JSON Schema or validation library (Zod/Joi/Marshmallow) to validate payload.
- id must be a URL-safe slug if provided; otherwise server generates a uuidv4.
- website must be HTTPS and a well-formed URL.
- tags must be array of short tokens.
- Sanitize short_description and example_use (strip html or escape on render).

9. Storage & Persistence Strategy
- Short-term (Phase 7): data/submissions.json (append-only semantic with atomic replace):
  1. Read current submissions file
  2. Append new record in memory
  3. Write to temp file
  4. Rename temp -> submissions.json (atomic on POSIX; on Windows use replace semantics)
- Ensure file write is atomic and use advisory lock or optimistic retry to avoid races. Limit concurrency (single writer pattern using a small mutex in process). Document that the JSON file is temporary and will be migrated to DB.
- Long-term (v2): Postgres table `submissions` with unique index on id and transactions for atomic moves to `tools` table on approval.

10. Idempotency and Duplicate Handling
- Support X-Idempotency-Key header: if the same key was used, return previous response.
- If client resubmits same payload without idempotency key and same id exists, return 409 unless client sets ?overwrite=true and is authorized.

11. Audit, Logging & Observability
- Emit structured events: submission_received, submission_validated, submission_persisted, submission_failed, submission_approved, submission_rejected.
- Metrics: submission_rate, submission_latency, submission_errors_by_type.
- Audit log must include submission id, client_id, IP, timestamp, and admin actions. Do not log secrets.

12. Failure Modes & Mitigations
- Disk full / write failure: return 500 and retry safe on client; alert via monitoring.
- Partial write / corrupted JSON: write to temp + validation before replacing; maintain backups.
- Concurrent writes: mutex or DB migration.
- Malicious payload (XSS): sanitize and escape on rendering; do not render raw descriptions in admin UI.
- Compromised credentials: rotate secrets and revoke client; monitor unusual volume.

13. Security & Trust Boundaries
- Basic Auth credentials are bearer secrets; require TLS. Limit Basic Auth client scopes to submission only.
- Limit rate per client_id. Implement IP-based rate limits as fallback.
- Admin endpoints must not accept Basic Auth clients unless explicitly authorized.

14. Tests (high-level, see tests.md)
- Unit: validation, auth check, storage helpers.
- Integration: POST /api/tools/submit with valid/invalid payloads, Basic Auth success/failure, idempotency, concurrency.
- E2E: browser form + admin approval flow.
- Security tests: ensure XSS vectors are sanitized, auth bypass attempts rejected.

15. Rollout Plan
1. Implement API & admin UI behind feature flag.
2. Run internal dark launch (invite-only) and collect telemetry.
3. Run QA and security review.
4. Flip feature flag for limited public usage.
5. Monitor errors and performance; iterate.

16. Acceptance Criteria (detailed)
- Automated tests pass in CI.
- Submissions recorded and visible in admin queue.
- Approving a submission moves the record to data/ai_tools.json (published) and visible in public lists.
- No secrets in repo; client secrets injected via CI/infra.

17. Implementation Estimate
- Backend: 3-4 days (API + validation + storage + tests)
- Admin UI: 2-3 days (form, listing, approve/reject flows)
- Release infra: 1 day (env, secrets, feature flag)
- QA + Security testing: 1-2 days

18. Next steps (immediate)
- Lock this technical plan (done)
- Create and assign subtasks to Staff Engineer, Release Engineer, QA Engineer (created in subtasks.md)
- After approval, start implementation in a feature branch: feat/gsta-12/tool-submission

(End of file)
