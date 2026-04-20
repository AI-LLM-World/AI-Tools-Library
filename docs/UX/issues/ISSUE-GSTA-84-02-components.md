Title: GSTA-84-02 — Implement core components (ToolCard, TagChip, SearchBar)

Description
----------
Add lightweight, accessible components to `packages/react-ui` so the frontend can reuse them across pages.

Files to add
- `packages/react-ui/src/components/ToolCard.tsx`
- `packages/react-ui/src/components/TagChip.tsx`
- `packages/react-ui/src/components/SearchBar.tsx`

Component API (minimum)
- ToolCard(props: { id, name, category, short_description, tags, website, onView })
- TagChip(props: { label, onClick, removable?, onRemove? })
- SearchBar(props: { value, onChange, onSubmit, placeholder })

Acceptance criteria
1. Components exist and are exported from `packages/react-ui/src/index.ts`.
2. A simple demo in `packages/frontend/src/App.tsx` shows these components rendering.
3. Components are keyboard accessible and use tokens for styling.

Notes
- Keep these presentational and small. Storybook stories are optional but recommended.
