Title: GSTA-84-05 — Submit Form (public)

Description
----------
Add a public submission form that posts to the existing backend endpoint `POST /api/submissions`.

Files to add
- `packages/frontend/src/pages/Submit.tsx`

Behavior
- Client validates required fields (id, name, category, short_description), suggests id from name, and posts to backend.
- On success show confirmation with submission id and status.

Acceptance criteria
1. Form validates inputs and prevents double submission.
2. Successful POST returns 201 and confirmation UI.
