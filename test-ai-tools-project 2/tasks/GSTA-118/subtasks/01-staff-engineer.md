title: GSTA-118.1  Staff Engineer Implementation (FE + BE)
owner: staff-engineer
estimate: 3d

Objective
---------
- Implement the Website v1 UI and backend endpoints required by the locked plan:
  - Frontend pages: catalog list, tool detail, admin submissions UI
  - Backend endpoints: GET /api/tools, GET /api/tools/:id, POST /api/tools/submit, admin approve/reject endpoints
  - Minimal shared component work: tokens package, ThemeProvider, Button (leverage packages/react-ui)

Deliverables
------------
1. Feature branch: feat/gsta-118/site-v1 with incremental commits and CI passing unit tests.
2. Frontend stories for updated components (Storybook optional but recommended per GSTA-10).
3. Backend validation and storage helpers for atomic writes to data/submissions.json and data/ai_tools.json.
4. Server-side sanitization of user-supplied text fields.
5. Unit and integration tests for endpoints and storage helpers.

Checklist
---------
- [ ] Create feature branch and PR template referencing GSTA-118 LOCKED_PLAN.md.
- [ ] Implement GET /api/tools with query + filter translation (file-backed read; keep memory usage modest).
- [ ] Implement POST /api/tools/submit with Basic Auth validation hook (read credentials from env only for now).
- [ ] Implement admin endpoints for listing pending and approving/rejecting submissions.
- [ ] Add server-side sanitization for description fields.
- [ ] Write unit tests for validation and storage helpers.
- [ ] Add simple e2e smoke test that covers submit -> approve -> appear in public listing.
- [ ] Request Staff Engineer review when ready.

Notes
-----
- Keep storage writes atomic and idempotent where possible. Use temp-file write + rename semantics and maintain a simple in-process mutex to avoid race conditions.
- Do not add DB migrations that are required for v2 during this task; GSTA-7 team will prepare migrations in parallel.
