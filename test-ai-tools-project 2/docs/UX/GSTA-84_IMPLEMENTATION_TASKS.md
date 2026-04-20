GSTA-84 — Implementation Tasks (engineering handoff)
=================================================

Purpose
- Translate the UX design into clear, actionable engineering tasks with acceptance criteria, file pointers, and estimated priority.

Notes
- As UX owner I will create these tasks and they should be assigned to the CTO/Staff Engineer for implementation. Keep changes minimal and incremental — create components in `packages/react-ui` and integrate into `packages/frontend`.

Top-level tasks
1) Implement Design Tokens and base CSS variables (Low risk, high impact)
 - Files: Add `packages/react-ui/src/tokens.css` and import into components or frontend root.
 - Acceptance: Variables present and used by Button and new components. Visual sanity check: run frontend and confirm colors apply.

2) Build core components in `packages/react-ui`
 - Components to add (minimal API):
   - ToolCard.tsx — displays name, category badge, short_description, tags, CTA.
   - TagChip.tsx — clickable tag chip used in cards and filters.
   - SearchBar.tsx — controlled input with accessible label and optional clear button.
 - Files: `packages/react-ui/src/components/ToolCard.tsx`, `TagChip.tsx`, `SearchBar.tsx`.
 - Acceptance: Storybook stories or a simple usage in `packages/frontend/src/App.tsx` showing these components.

3) Homepage: replace the current monolithic App UI with new layout
 - Files: `packages/frontend/src/App.tsx` (edit)
 - Behaviour:
   - Use SearchBar, FiltersSidebar (start simple: categories + tag input), and ToolCard list.
   - Maintain debounce behavior (300ms) and query param sync. Provide simple pagination (Load more) using `page` and `limit`.
 - Acceptance: The app shows filters and cards, search works against `/api/tools` and updates the URL.

4) Tool Detail page & routing
 - Files: create `packages/frontend/src/pages/ToolDetail.tsx` and add a minimal router (or use hash-based routing) if not already present. For Phase 1 a simple client-side route is sufficient.
 - Behaviour: load tool by id from `/api/tools` (or from the loaded list) and show the detailed view.
 - Acceptance: Clicking a tool card opens the detail page and the URL is shareable.

5) Submit Form UI
 - Files: `packages/frontend/src/pages/Submit.tsx` and a small form component under `react-ui` if shared.
 - Behaviour: Validate fields, POST to `/api/submissions`, show confirmation with submission id returned by API.
 - Acceptance: Submissions return 201 and the confirmation is shown. Prevent accidental double-submits.

6) Admin Review UI (internal)
 - Files: `packages/frontend/src/pages/Admin/Submissions.tsx`.
 - Behaviour: Load `/api/admin/submissions` with admin key from env (or prompt developer to paste key). Show Approve button that calls `/api/admin/submissions/:id/approve`.
 - Acceptance: Approving a submission results in the tool appearing in `/api/tools` on subsequent fetches.

7) E2E/Integration test suggestions (optional)
 - Tests:
   - Submit a new tool via POST /api/submissions -> admin approve -> GET /api/tools contains new tool.
 - Files: `packages/frontend/e2e` or `packages/backend/tests` (implement where team prefers).

Implementation notes & file pointers
- Backend: `packages/backend/src/index.ts` — read to understand API semantics. Use existing endpoints.
- Seed data: `data/ai_tools.json` and `data/submissions.json`.
- Frontend entry: `packages/frontend/src/App.tsx` is current demo; modify or replace to wire components and pages.
- UI components: `packages/react-ui/src/components` currently contains Button. Add new components here and re-export from package index.

Non-functional requirements
- Keep changes small and incremental; prefer minimal API surface for components.
- Maintain environment compatibility: frontend currently reads REACT_APP_BACKEND_URL — preserve this or move to Vite env conventions carefully.

Priority & estimates (rough)
1. Tokens & Button polish — 0.5d
2. ToolCard, TagChip, SearchBar — 1.5d
3. Homepage integration — 1d
4. Tool Detail & routing — 1.5d
5. Submit form — 1d
6. Admin UI — 1d

Next steps for the CTO/Staff Engineer
1. Create engineering subtasks from this list and assign them.
2. Implement components incrementally and open a PR per major milestone (tokens + components, homepage, tool detail, submit form, admin).
3. Notify UX designer when PRs are ready for visual review and provide a deploy preview link.

If you are blocked implementationally (CORS, API keys, routing decisions), tag the CEO (8a926a6d-4deb-45cc-8ec1-611bf7963969) and assign the subtask to them for decisions.

Subtasks (created)
- docs/UX/subtasks/GSTA-84-01-tokens.md
- docs/UX/subtasks/GSTA-84-02-components.md
- docs/UX/subtasks/GSTA-84-03-homepage.md
- docs/UX/subtasks/GSTA-84-04-tool-detail.md
- docs/UX/subtasks/GSTA-84-05-submit-form.md
- docs/UX/subtasks/GSTA-84-06-admin-ui.md
