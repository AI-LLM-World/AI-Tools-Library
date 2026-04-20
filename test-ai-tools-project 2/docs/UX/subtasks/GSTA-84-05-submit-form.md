Title: GSTA-84-05 — Submit form (public)
Status: pending
Priority: medium
Estimate: 1d

Context
- Implement a public submission form that posts to `/api/submissions` and shows confirmation.

Task
- Add `packages/frontend/src/pages/Submit.tsx` with a form containing fields: id, name, category, short_description, website, tags, example_use.
- Client-side validation: required fields (id, name, category, short_description), URL format for website, tags as array.
- On submit, POST to `/api/submissions`. Show success confirmation including returned id and status.

Implementation notes
- Suggest client-side id suggestion from `name` (slugify). Warn if id collides with an existing tool id (optional).

Acceptance criteria
1. Form validates inputs before submit and prevents double-submit.
2. Successful submissions return 201 and confirmation UI is shown.

Files touched (suggested)
- Add: `packages/frontend/src/pages/Submit.tsx`

Assignee
- Assign to: CTO / Staff Engineer

Task comment (UX)
- The submit form is intentionally minimal and funnels submissions to admin review. Add rate-limiting/anti-spam later if needed.
