Title: GSTA-84-02 — Core components: ToolCard, TagChip, SearchBar
Status: pending
Priority: high
Estimate: 1.5d

Context
- Add lightweight, accessible components in `packages/react-ui` so they can be reused across the frontend.

Task
- Implement these components:
  - `ToolCard.tsx` — props: { id, name, category, short_description, tags, website, onView }.
  - `TagChip.tsx` — props: { label, onClick, removable? }.
  - `SearchBar.tsx` — props: { value, onChange, onSubmit, placeholder } with accessible label and clear button.

Implementation notes
- Keep components unopinionated about layout (expose className prop). Use tokens for spacing, colors, and border-radius.
- Add basic unit tests or Storybook stories if time allows.

Acceptance criteria
1. Components are added to `packages/react-ui/src/components/` and exported from the package index.
2. Stories or a simple demo usage in `packages/frontend/src/App.tsx` show the components rendering with the tokens.
3. Components are keyboard accessible (SearchBar input focusable, TagChip focusable with enter/space activation).

Files touched (suggested)
- Add: `packages/react-ui/src/components/ToolCard.tsx`, `TagChip.tsx`, `SearchBar.tsx`
- Edit: `packages/react-ui/src/index.ts` (export components)

Assignee
- Assign to: CTO / Staff Engineer

Task comment (UX)
- These core components follow the design spec and will be reused on the homepage, category pages, and tool detail pages. Implement them first to make the rest of the UI integration straightforward.
