Title: Admin Dashboard — Wireframe & Workflow
Status: in_progress
Author: UX Designer
Date: 2026-04-20

Context
- Internal dashboard for listing and approving submissions. Backend endpoints: GET /api/admin/submissions and POST /api/admin/submissions/:id/approve.

ASCII Wireframe

--------------------------------------------------------------
| Admin: Submissions     | Search | [Settings] [Logout]       |
--------------------------------------------------------------
| Filters: status [All|Pending|Approved|Rejected]               |
--------------------------------------------------------------
| Table: id | name | category | createdAt | status | actions   |
| ----------------------------------------------------------- |
| 123 | Test Submission | NLP | 2026-04-19 | pending | [View] [Approve] |
| ----------------------------------------------------------- |

Details panel (modal or side-sheet)
- Shows full submission payload and action buttons: Approve, Reject (with reason modal).

Interactions & security
- Admin endpoints require `SUBMISSIONS_ADMIN_KEY` via header `x-admin-api-key` or `Authorization: Bearer <key>`. When env var unset, endpoints are unprotected for dev. UI should not silently persist the admin key — store it only in memory during the session or prompt on every visit.
- Approve: confirmation modal required. On success, row updates to `approved` and optionally a small toast is shown.

Acceptance criteria (Admin)
1. Admin Submissions page lists submissions from GET /api/admin/submissions.
2. Approve calls POST /api/admin/submissions/:id/approve and updates status on success.
3. UI handles errors (401 unauthorized, 404 not found) and shows helpful messages.

Operational notes
- This UI is internal and may be gated by network access. Do not expose admin key in logs or persisted local storage.
