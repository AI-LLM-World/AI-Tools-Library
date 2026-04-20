Title: Homepage — Wireframe & Component Spec
Status: in_progress
Author: UX Designer
Date: 2026-04-20

Context
- Deliverable requested by CEO: continue designing the AI Tool Library pages and deliver wireframes + component specs. This file covers the Homepage (search + discovery surface).

ASCII Wireframe (Desktop, two-column)

--------------------------------------------------------------
| Logo | [ Search: ____________________________ ] [Submit] [Admin] |
--------------------------------------------------------------
| Hero (prominent search)                                      |
| "Search tools, e.g. \"semantic search\""                    |
--------------------------------------------------------------
| Filters (left)                | Results (right)               |
| ----------------------------- | ----------------------------- |
| [Categories]                  | Results: 124                 |
|  - NLP                        | [Filter chips: "NLP" x]     |
|  - Vision                     | ----------------------------- |
|  - Search                     | [ToolCard] [ToolCard] [..]   |
|  - Analytics                  | [ToolCard] [ToolCard] [..]   |
|  - ...                       | [Load more]                  |
--------------------------------------------------------------

Mobile (single column)
- Header: Logo + search icon
- Search (prominent) then quick categories as horizontal scroll chips
- Results cards stacked vertically

Primary components used
- SearchBar
  - Props: { value: string, onChange: (v) => void, onSubmit: () => void, placeholder?: string }
  - Behavior: controlled input, debounced changes (300ms), accessible label (aria-label="Search tools"), clear button.

- FiltersSidebar
  - Props: { categories: string[], selectedCategory?: string, tags: string[], onCategorySelect, onTagAdd, onClear }
  - Behavior: category list (single-select), tag input with typeahead. Show hint: "Tags use AND semantics".

- ToolCard
  - Props: {
      id: string,
      name: string,
      category?: string,
      short_description?: string,
      website?: string,
      tags?: string[],
      onView?: (id) => void,
      onVisit?: (url) => void,
    }
  - Markup: <article> with heading (h3), category badge (span role="note"), paragraph, tag list, actions.
  - Actions: "Visit" (anchor target=_blank rel="noopener noreferrer"), "Details" (internal navigation to /tools/:id), keyboard accessible.
  - Visual: name left, category badge top-right, short desc below, tag chips below description, CTA(s) in footer.

- TagChip
  - Props: { label: string, onClick?: () => void, removable?: boolean, onRemove?: () => void }
  - Behavior: clickable (enter/space), focus ring, removable via small "x" button with accessible label (eg. "Remove tag foo").

- Pagination / LoadMore
  - Simple Load more button to fetch next page (ease of implementation). Props: { onLoadMore, hasMore }

Key interactions
- Search: debounce 300ms (preserve current frontend behavior). Query string param: `q`.
- Filters: category => query param `category`, tags => query param `tags` (comma-separated). All filter state reflected in URL for shareability.
- Tag click: clicking a tag chip adds that tag to filters and updates results.
- ToolCard details: clicking card or "Details" navigates to `/tools/:id`.

Acceptance criteria (Homepage)
1. The search input is visible, accessible, and triggers backend call to GET /api/tools?q=<q>&limit=<n> after 300ms debounce.
2. Filters are present, and selecting category or tags filters results server-side by calling GET /api/tools with `category` and `tags` params.
3. Results display ToolCard components with name, category, short_description, and tags.
4. Clicking a ToolCard navigates to the Tool Detail page and is shareable by URL.
5. Empty results show a helpful empty state with suggested categories and example searches.

Accessibility notes
- Use semantic HTML: <header>, <main>, <aside>, <article> for ToolCard.
- All interactive controls must have keyboard focus states and descriptive aria-labels.
- Color contrast must meet WCAG AA for primary text and CTA contrast.

Usability risks & mitigations
- Risk: Tag AND semantics surprises users accustomed to OR. Mitigation: show hint copy near tags input "Tags use AND semantics — results must contain all selected tags." and provide tooltip on hover.
- Risk: Large result sets causing slow pages. Mitigation: server-side filtering + limit + Load more to avoid huge payloads.

Developer notes
- Use design tokens from `packages/react-ui/src/tokens.css` for colors and spacing.
- Keep components presentational and exportable from `packages/react-ui` so other pages can reuse them.
