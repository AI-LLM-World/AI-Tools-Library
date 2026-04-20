Title: Category Page — Wireframe & Spec
Status: in_progress
Author: UX Designer
Date: 2026-04-20

Context
- Category pages surface tools in a specific category and reuse components from the Homepage (filters + ToolCard list).

ASCII Wireframe

--------------------------------------------------------------
| Breadcrumbs: Home / CategoryName                             |
--------------------------------------------------------------
| CategoryName (large)                                         |
| Short category description (optional)                        |
--------------------------------------------------------------
| Filters (left)                | Results (right)               |
| ----------------------------- | ----------------------------- |
| [Subcategories? optional]     | Results: 42                  |
| Tags filter                    | [ToolCard] [ToolCard] [..]   |
|                               | [Load more]                  |
--------------------------------------------------------------

Behavior
- Visiting `/category/:name` or `/?category=name` shows only tools with category case-insensitively matching the value.
- Reuse FiltersSidebar and ToolCard components to maintain consistency.

Acceptance criteria (Category Page)
1. Category page lists tools filtered by category and shows the result count.
2. Filters and tags remain usable and update the URL.
3. Related categories or common tags can be suggested in the sidebar (optional enhancement).
