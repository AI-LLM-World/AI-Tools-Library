Title: GSTA-84-06 — Admin Review UI (internal)
Status: pending
Priority: medium
Estimate: 1d

Context
- Provide a basic internal admin UI to list submissions and approve them using backend admin endpoints.

Task
- Add `packages/frontend/src/pages/Admin/Submissions.tsx` that:
  - GETs `/api/admin/submissions` using admin key passed via UI prompt or env (developer choice)
  - Displays a table of submissions with Approve button for each
  - Approve action calls POST `/api/admin/submissions/:id/approve` and updates status on success

Implementation notes
- Admin key: for dev, allow the developer to paste the key into a modal. Do not store the key in local storage long-term unless the team is comfortable.

Acceptance criteria
1. Admin page lists submissions and shows status values.
2. Approving a submission results in a 200 response and the submission status changes to approved. GET /api/tools returns the new tool after approval.

Files touched (suggested)
- Add: `packages/frontend/src/pages/Admin/Submissions.tsx`

Assignee
- Assign to: CTO / Staff Engineer

Task comment (UX)
- Keep the admin UI simple and internal-only. The backend already provides the necessary endpoints; this subtask wiring makes the workflow visible to operators.
