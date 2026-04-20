Title: Tool Detail — Wireframe & Component Spec
Status: in_progress
Author: UX Designer
Date: 2026-04-20

Context
- Tool Detail page is the canonical place for detailed information about an AI tool and CTAs for users (visit site, share, suggest edit).

ASCII Wireframe (Desktop)

---------------------------------------------------------------
| Breadcrumbs: Home / Category / Tool Name                      |
---------------------------------------------------------------
| Tool Name                            [Category Badge] [Tags]  |
| Short description (one-liner)                                    |
---------------------------------------------------------------
| Left: Main column (content)   | Right: Actions & Related       |
| ----------------------------- | ----------------------------- |
| Full description / example_use | [Visit website] (primary)     |
| Additional metadata:           | [Share] [Suggest edit]        |
| - id: gstack-bert               | Related tools (cards list)    |
| - tags: embeddings, transformer |                              |
---------------------------------------------------------------

Components used
- DetailHeader
  - Props: { name, category, tags, short_description }
  - Behavior: shows title, category badge, tag row (clickable), and short description.

- DetailBody
  - Renders longer example_use text, instructions, and any additional fields available.

- ActionPanel
  - Props: { website, onShare, onSuggestEdit }
  - Primary: Visit website (anchor) with rel attrs.
  - Secondary: Share copies canonical URL to clipboard and shows a toast confirmation; Suggest Edit opens a modal or mailto link to report an issue.

- RelatedToolsList (re-uses ToolCard)
  - Shows 3-6 tools that share category or tags. Items link to their detail pages.

Interactions
- Visit: opens website in new tab with `rel="noopener noreferrer"`.
- Share: copies canonical URL to clipboard. Show small tooltip: "Link copied".
- Tags: clicking a tag navigates to listing page with the tag filter applied.

Acceptance criteria (Tool Detail)
1. URL pattern `/tools/:id` loads the tool and renders the detail page (title, category, description, example_use, tags, website).
2. Visit action opens in new tab and uses secure link attributes.
3. Share action reliably copies the canonical URL to clipboard and gives the user immediate feedback.
4. Tags navigate to the filtered listing page.

Edge cases
- Missing tool (404): show a simple message: "Tool not found" and a button to return to search.
- Partial data: gracefully render available fields and hide absent sections.

Accessibility
- Use <main> landmark and proper heading hierarchy (h1 tool title, h2 sections).
- Ensure share and visit buttons are keyboard accessible and have aria-labels.
