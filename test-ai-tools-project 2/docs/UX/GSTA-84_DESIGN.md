GSTA-84 — UX Design: AI Tool Library
===================================

Status: in_progress

Issue: GSTA-84

Issue Comment (for the issue thread)
: I started the UX design work for GSTA-84. Added initial wireframes, interaction specs, user journeys, acceptance criteria, and an implementation task list. Files added: `docs/UX/GSTA-84_DESIGN.md`, `docs/UX/GSTA-84_IMPLEMENTATION_TASKS.md`. Next: create subtasks for engineering from the implementation tasks and assign to the CTO/Staff Engineer. I'll produce hi-fi mockups after alignment.

Context & references
- Existing frontend search demo: `packages/frontend/src/App.tsx`
- Backend tools API and admin endpoints: `packages/backend/src/index.ts`
- Seed data: `data/ai_tools.json`

Design goals
- Help users find relevant AI tools quickly via search, category discovery, and tags.
- Provide a clear tool detail view with calls-to-action and trusted metadata.
- Enable public submissions with a safe admin review workflow.
- Keep UI accessible, responsive, and lightweight for Phase 1 (file-backed data store).

User journeys (high level)
- Explore & discover: Land on the homepage, search or pick a category, scan results, open tool detail, visit vendor site.
- Filtered discovery: Apply category + tags + sort to narrow results, paginate or "Load more".
- Submit: User fills submit form; submission goes to review queue (status: pending).
- Admin review: Admin lists submissions, inspects details, approves -> tool appears in public catalog.

Design artifacts
================

**Homepage**

Purpose
- Let users search across the catalog and discover tools by category or tags.

Layout (desktop)

Header: [Logo] [Global search (prominent)] [Nav: Categories | Submit Tool | Admin]

Hero: Large search input (centered) with example placeholder text and optional quick category chips below.

Main area: 2-column layout
- Left column (filters, sticky on scroll): Category list, tag input (typeahead), sort control, clear filters button.
- Right column (results): Result count & active filters row, tool cards list/grid, pagination or "Load more".

Mobile: Single column. Search at top, filters expand/collapse into a sheet.

Tool card (summary)
- Name, category badge, short_description, tag chips, Visit website button, small actions: "View details" and "Suggest edit".

Interactions
- Search: debounced (300ms). Existing frontend already implements a 300ms debounce; preserve that.
- URL state: q, category, tags, page encoded in query params so links are shareable.
- Filters: tag filters use AND semantics (as backend supports). Category filter is case-insensitive exact match.
- Empty state: show guidance and suggest popular categories and example searches.

Acceptance criteria (Homepage)
1. Search input is visible and usable on desktop and mobile; typing triggers results after 300ms debounce.
2. Results show the total count and a list of Tool Cards with name, category, short_description, and tags.
3. Clicking a Tool Card navigates to the Tool Detail view for that tool (route: `/tools/:id` or internal route that loads the item by id).
4. Category and tag filters apply server-side and update the UI and the URL query string.
5. Pagination or Load more works; `page` and `limit` are reflected and respected by API responses.
6. Empty and error states display user-friendly messages and help suggestions.

**Tool Detail**

Purpose
- Provide authoritative metadata for a single tool and clear actions (visit site, suggest edit, copy link).

Layout
- Breadcrumbs: Home / Category / Tool name
- Title row: Tool name, category badge, tags, visit link (primary CTA)
- Main content: full description (short_description + example_use), website link, tags with click-to-filter behavior, metadata (id, created/approved info if available)
- Side column: Related tools (based on category or shared tags), quick actions (share link, report issue, suggest edit)

Interactions
- Visit website opens in a new tab with `rel="noopener noreferrer"`.
- Tags are clickable and navigate back to the homepage or category view with the tag applied.
- Share action copies the canonical URL to clipboard.

Acceptance criteria (Tool Detail)
1. Tool detail page shows name, category, short_description, example_use, website link, and tags.
2. The Visit button opens the tool's `website` in a new tab with secure link attributes.
3. Clicking a tag or category navigates to the filtered listing with the right query params.
4. The page is reachable from a Tool Card and via a direct permalink (URL includes an id or enough state to load the tool).

**Category Page**

Purpose
- Surface all tools within a category and allow further filtering/sorting.

Layout
- Category header with name and optional description; result count; filters & tool list (re-uses homepage components).

Acceptance criteria (Category)
1. Visiting `/category/:name` (or homepage with `?category=`) shows only tools for that category.
2. Category filter is reflected in the URL and persists when navigating.

**Submit Form (Public)**

Purpose
- Allow anyone to propose a new tool. Submissions enter a review queue (status: pending).

Fields (minimum)
- id (slug) — required, client-side suggestion from name (lowercase, dash).
- name — required
- category — required (typeahead from existing categories + free text)
- short_description — required
- website — optional, must be validated as URL
- tags — optional tag input (comma or Enter to add)
- example_use — optional

Interactions & validation
- Client-side validation for required fields and URL format. Warn if `id` collides with an existing tool (optional: call GET /api/tools and check ids).
- On submit POST to `/api/submissions`. Show success message with submission id and status (pending).
- Disable the form while submitting, show inline errors from the API.

Acceptance criteria (Submit Form)
1. Form validates required fields before submission.
2. A successful submission results in POST /api/submissions and shows a confirmation UI (submission id and pending state).
3. Client prevents accidental duplicate submissions (disable submit button while request in-flight).

**Admin Dashboard (Review Queue)**

Purpose
- Allow platform operators to review, approve, or reject submissions and manage published tools.

Auth & security
- Admin endpoints require `SUBMISSIONS_ADMIN_KEY` (header `x-admin-api-key` or `Authorization: Bearer <key>`). If the env var is unset, admin endpoints are unprotected for development only; UI must clearly mask that behavior in prod.

Layout
- Left nav: Submissions, Tools, Users, Settings
- Submissions list: table with columns (id, name, category, createdAt, status, actions)
- Details panel: full submission payload and Approve / Reject buttons with confirmation modal

Interactions
- Approve action calls `POST /api/admin/submissions/:id/approve` including the admin key.
- On success, the submission status becomes `approved` and the tool is promoted into the public ai_tools.json (backend behavior). UI must refresh the public tools listing to reflect promotion.

Acceptance criteria (Admin)
1. Admin listing loads submissions from GET /api/admin/submissions and shows correct statuses.
2. Approving a submission calls POST /api/admin/submissions/:id/approve and receives success; after approval GET /api/tools includes the new tool.
3. UI displays request errors and requires a confirmation step before approve/reject.

Design system (Phase 1)
- Core tokens (CSS variables)
  --gstack-color-primary-default: #0ea5a4
  --gstack-color-primary-contrast: #ffffff
  --gstack-bg: #ffffff
  --gstack-text: #0f172a
  --gstack-muted: #6b7280
  --gstack-radius: 8px
  --gstack-spacing-1: 4px
  --gstack-spacing-2: 8px
  --gstack-spacing-3: 16px

- Key components (surface API)
  ToolCard(props: { id, name, category, short_description, tags, website })
  TagChip(props: { label, onClick })
  SearchBar(props: { value, onChange, onSubmit, placeholder })
  FiltersSidebar(props: { categories, selectedCategory, tags, onChange })
  SubmitForm — controlled form component that POSTs to `/api/submissions`.

Accessibility notes
- All interactive controls must be reachable by keyboard and have descriptive ARIA labels.
- Color contrast should meet WCAG AA for text and controls.
- Use semantic HTML for lists, headings, and forms.

Risks & mitigations
- Risk: Large dataset will make client-side operations slow.
  Mitigation: Keep filtering and sorting server-side and use pagination/limit.
- Risk: Spammy submissions.
  Mitigation: Rate-limit submissions, add captcha if abuse is detected, ensure admin review flow.
- Risk: Confusing tag semantics (AND vs OR).
  Mitigation: Show explicit hint: "Tags use AND semantics — results must contain all selected tags." and keep the backend behavior (AND) unchanged.

Deliverables added in this change
- `docs/UX/GSTA-84_DESIGN.md` (this file) — wireframes, specs, acceptance criteria.
- `docs/UX/GSTA-84_IMPLEMENTATION_TASKS.md` — engineering subtasks and file pointers.

Next steps (recommended)
1. Create issue subtasks for engineering from the Implementation Tasks doc and assign to the CTO/Staff Engineer. Link to these design files.
2. Align on colors/typography and create hi-fi mockups (Figma) for the Homepage and Tool Detail.
3. Implement a small set of components in `packages/react-ui` (ToolCard, TagChip, SearchBar) and wire them into `packages/frontend`.

If blocked or scope changes are requested, tag the CEO (8a926a6d-4deb-45cc-8ec1-611bf7963969).
