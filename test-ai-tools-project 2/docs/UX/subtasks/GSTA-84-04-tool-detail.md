Title: GSTA-84-04 — Tool Detail page & routing
Status: pending
Priority: high
Estimate: 1.5d

Context
- Add a Tool Detail page reachable from ToolCard that shows full metadata, CTA, and related tools.

Task
- Implement `packages/frontend/src/pages/ToolDetail.tsx`:
  - Read tool id from route params (or query param)
  - Fetch tool data (either GET /api/tools?q=<id> or preload from listing)
  - Render name, category, short_description, example_use, tags, website CTA, and related tools list.

Implementation notes
- Routing: if the app does not currently use a router, implement a minimal route handler (e.g. simple hash-based router) for Phase 1.
- Canonical URL format: `/tools/:id` or `/#/tools/:id` depending on routing choice. The URL must be shareable and load the page directly.

Acceptance criteria
1. Clicking a tool card navigates to the Tool Detail page for that tool.
2. The Tool Detail page loads when visited directly by URL and displays expected fields.
3. Tags are clickable and navigate back to the listing filtered by that tag.

Files touched (suggested)
- Add: `packages/frontend/src/pages/ToolDetail.tsx`
- Edit: routing in `packages/frontend/src/main.tsx` or App.tsx

Assignee
- Assign to: CTO / Staff Engineer

Task comment (UX)
- Tool Detail must be accessible from listing and via direct URL. This subtask ensures the product provides shareable, discoverable tool pages.
