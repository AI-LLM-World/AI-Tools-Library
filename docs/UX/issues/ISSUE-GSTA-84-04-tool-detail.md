Title: GSTA-84-04 — Tool Detail page & routing

Description
----------
Create a Tool Detail page reachable from ToolCard that displays full metadata and actions.

Files to add
- `packages/frontend/src/pages/ToolDetail.tsx`

Behavior
- Route: `/tools/:id` (or hash router equivalent)
- Fetch tool by id and render title, short_description, example_use, tags, website CTA, and related tools.

Acceptance criteria
1. Clicking a ToolCard opens the Tool Detail page.
2. Visiting `/tools/:id` directly loads the page and shows expected fields.
