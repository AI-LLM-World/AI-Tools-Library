Title: GSTA-84-06 — Admin Review UI (internal)

Description
----------
Implement a simple admin UI to list submissions and approve or reject them using backend admin endpoints.

Files to add
- `packages/frontend/src/pages/Admin/Submissions.tsx`

Behavior
- Load `GET /api/admin/submissions` with admin key and show submissions in a table. Approve calls `POST /api/admin/submissions/:id/approve`.

Acceptance criteria
1. Admin page shows submissions and statuses.
2. Approving a submission persists status and promoted tool appears in GET /api/tools.
