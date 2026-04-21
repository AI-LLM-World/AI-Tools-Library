CTO Locked Technical Execution Plan — GSTA-118
===========================================

Title: GSTA-118 CTO: Critical path - ship website v1 ASAP (coordinates GSTA-7..GSTA-12)

Scope
-----
- Deliver a producible Website v1 (public catalog + basic search & filters, admin submission + review flow, shared UI tokens) fast and safely.
- Coordinate and unblock related work items: GSTA-7 (DB schema/migrations), GSTA-10 (UI component library), GSTA-11 (search), GSTA-12 (tool submission & basic auth).

Goal and non-goals
------------------
- Goal: Ship a minimal, secure, test-covered website v1 that supports: public listing of published tools, typed search & filters (server-backed or in-process), admin submission review (manual approve/reject), and CI-backed rollout behind a feature flag.
- Non-goals: full-scale migration to Postgres-backed catalog, multi-tenant RLS, OAuth SSO for Admin, or advanced performance optimizations. Those belong to later phases.

Principles & Constraints
------------------------
- Smallest correct change: implement the minimal feature set to deliver value and iterate.
- Safe by default: migrations/backfills are isolated and rehearsed on staging/canaries. Admin-only flows are gated behind feature flags and internal auth.
- Reuse existing repo structure and artifacts: frontend packages, backend server, data/ai_tools.json pattern (used by GSTA-12), and existing CI scaffolding.

High-level architecture
----------------------
- Frontend: React app (packages/frontend) with canonical components coming from packages/react-ui (GSTA-10). Pages:
  - / (public catalog list)
  - /tool/:id (tool detail)
  - /admin/submissions (admin review UI)
- Backend: Node/TS API (packages/backend) exposing:
  - GET /api/tools (list + search & filters)
  - GET /api/tools/:id
  - POST /api/tools/submit (Basic Auth for programmatic clients)
  - GET/POST /api/tools/submissions (admin flows)
- Storage:
  - Phase 1 (v1): data/ai_tools.json (published catalog), data/submissions.json (pending submissions). Use atomic write pattern (temp -> replace) and a single-writer mutex where feasible.
  - Phase 2+: Postgres (GSTA-7) migration path is prepared in parallel; production cutover is separate.

Data Flow (happy path)
----------------------
1. Browser requests / -> Frontend calls GET /api/tools?query=...&filters=...
2. Backend reads data/ai_tools.json (or a shallow cache) and applies search/filters, returns JSON list.
3. Admin or Basic Auth client POSTs submission to /api/tools/submit -> Backend validates, persists to data/submissions.json, emits event submission_received.
4. Admin approves via admin UI -> Backend moves approved record from submissions.json to ai_tools.json atomically and emits submission_approved.

Minimal Viable Surface for "ship ASAP"
--------------------------------------
- Public catalog pages with server-side search & filtering working on ai_tools.json (no DB dependency).
- Admin submission UI and programmatic Basic Auth endpoint storing to submissions.json.
- Canonical minimal tokens and ThemeProvider in the component library and a Button component used across pages.
- CI run: unit + integration + basic e2e smoke; deploy behind feature flag.

Risks and mitigations
---------------------
- Concurrent writes to JSON files (submissions.json / ai_tools.json): mitigate with atomic temp-file replace and simple process mutex. Release Engineer to ensure single writer or queue jobs.
- Disk full / write errors: return 500 and alert; QA to include failure tests. Keep file sizes small by expecting modest initial volume.
- XSS from submitted descriptions: sanitize and escape on render. Implement server-side sanitization plus safe rendering in React.
- Compromised Basic Auth credentials: secrets stored outside repo, rate limit per client, rotation plan.
- Migration complexity (GSTA-7): treat migrations as parallel work. For website v1 use JSON-backed store to avoid migration blockers.

Test Matrix (summary)
---------------------
- Unit tests: validation, storage helpers (atomic write), search translator. Fast, run in CI.
- Integration tests: spin ephemeral Postgres only for GSTA-7 tests (separate pipeline). For website v1, run integration tests against file-backed storage.
- E2E: headless browser smoke: list -> search -> submit -> admin approve -> published appears.
- Performance (smoke): simulate 100 concurrent read requests, and 50 concurrent submission attempts to validate storage concurrency.

Acceptance Criteria
-------------------
1. Public catalog renders and shows published tools from data/ai_tools.json.
2. Search & filters return correct, paginated results for representative queries.
3. POST /api/tools/submit accepts valid submissions with Basic Auth and returns 201 with id and status pending.
4. Admin UI lists pending submissions; approving moves a tool to data/ai_tools.json visibly.
5. CI runs unit+integration+e2e smoke and passes. Manual canary rollout completes without critical errors.

Implementation owners and high-level split
----------------------------------------
- CTO: lock plan, unblock decisions, resolve cross-team priorities.
- Staff Engineer (frontend + backend owner): implement feature branches, unit/integration tests, PR to Staff Engineer for review when ready.
- Release Engineer: CI, feature flag, deploy staging, migrations coordination, canary rollout.
- QA Engineer: tests, e2e harness, migration rehearsal, runbook verification.

Timeline (fast-path, 1 work-week minimal)
---------------------------------------
Day 0 (planning): This locked plan is posted and subtasks assigned.
Day 1-2: Staff Engineer implements frontend pages, minimal search backend, submission endpoint, basic UI components. Unit tests.
Day 3: QA runs integration and e2e smoke locally / in CI. Release Engineer configures feature flag and staging deploy.
Day 4: Canary deploy to small internal audience; monitor for 4-6 hours.
Day 5: If stable, roll to broader audience. Post-launch monitoring and bug fixes.

When to escalate
-----------------
- Any failing migration rehearsal (GSTA-7) that blocks a necessary backend change.
- Any data corruption or file-write failure observed in staging or pilot.

Next immediate actions (CTO)
---------------------------
1. Create and assign the subtasks in this directory to Staff/Release/QA engineers (done: see subtasks/).
2. Staff Engineer to open feature branch feat/gsta-118/site-v1 and start implementation.
3. Release Engineer to prepare CI pipeline and staging deployment and feature flag.

(Signed) CTO — LOCKED at runtime
