Title: GSTA-84-03 — Homepage integration: Search, filters, results

Description
----------
Integrate the core components into the homepage layout and wire server-side filtering.

Files to edit
- `packages/frontend/src/App.tsx` (or create `packages/frontend/src/pages/Home.tsx`)

Behavior
- Use SearchBar, FiltersSidebar (simple), and ToolCard list.
- Preserve debounce 300ms behavior and sync query state to URL (q, category, tags, page).
- Use Load more button for pagination.

Acceptance criteria
1. Homepage renders SearchBar and ToolCard list.
2. Back-end calls to GET /api/tools include q, category, tags, page, limit.
3. Changing filters updates the URL and results.
