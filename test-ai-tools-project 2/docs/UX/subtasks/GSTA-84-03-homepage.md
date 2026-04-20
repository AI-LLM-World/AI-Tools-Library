Title: GSTA-84-03 — Homepage integration: Search, Filters, Results
Status: pending
Priority: high
Estimate: 1d

Context
- Replace the simple search demo in `packages/frontend/src/App.tsx` with the designed homepage layout using the new core components.

Task
- Implement homepage layout:
  - Prominent search bar (SearchBar)
  - Filters sidebar (categories list, tag input) — can be simplified for Phase 1
  - ToolCard list with Load more pagination
  - Sync q, category, tags, page to URL query params

Implementation notes
- Keep server-side filtering (call GET /api/tools with params q, category, tags, page, limit).
- For initial implementation, categories can be derived from the tools list (unique categories) on first load.

Acceptance criteria
1. Homepage uses SearchBar and ToolCard components.
2. Search and filters update results using backend endpoints and update the browser URL.
3. Pagination (Load more) appends the next page of results.

Files touched (suggested)
- Edit: `packages/frontend/src/App.tsx` (or create `pages/Home.tsx` and wire routing)

Assignee
- Assign to: CTO / Staff Engineer

Task comment (UX)
- This task wires the design into the existing frontend, keeping the backend API intact for server-side filtering.
