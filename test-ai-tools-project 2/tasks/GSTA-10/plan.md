GSTA-10 Phase 5: Reusable UI component library — Technical Execution Plan
==============================================================

Status: in_progress
Priority: high

Overview
--------
We're building a production-ready, reusable UI component library targeted at GStack internal apps (admin dashboards, marketing pages, and embedded widgets). Phase 5 locks the technical execution plan: architecture, component boundaries, design tokens, theming, accessibility, test strategy, CI, packaging, and the rollout plan.

Note: HEARTBEAT.md is present in the repository and was reviewed as part of this heartbeat.

Goals & Success Criteria
------------------------
- Deliver a TypeScript React component library (internal-first) with:
  - Design tokens and theming provider
  - 12 core, accessible components (Button, Input, Select, Checkbox, Radio, Modal, Tooltip, Card, Tabs, Accordion, Table, Toast)
  - Storybook documentation (CSF/MDX) for all components + examples
  - Automated unit + accessibility + visual regression tests
  - Packaging strategy for monorepo consumption and npm (private) publishing
- Acceptance criteria
  - All core components have stories covering variants and states
  - RTL + unit tests pass with ≥ 90% component behavioral coverage for core components
  - Axe accessibility checks pass on all stories (no severe violations)
  - Visual snapshots recorded for primary variants and regressions guarded in CI
  - Theme provider demonstrates at least two themes (light, dark) and runtime switching

Scope (in / out)
-----------------
In scope:
- API design and implementation for the core component set listed above
- Design tokens (JSON + CSS variables) and a ThemeProvider component
- Storybook with MDX docs and usage examples
- Tests: Jest + React Testing Library + jest-axe + visual snapshots (Chromatic or similar)
- CI integration for lint, typecheck, tests, storybook build, and visual checks

Out of scope (Phase 5):
- Full design system website beyond Storybook (can be added later)
- Third-party component wrappers (e.g., datepickers) — we'll create adapters later
- Heavy runtime CSS-in-JS solutions — prefer CSS variables + small runtime

Tech Decisions (rationale)
--------------------------
- Framework: React + TypeScript. Minimal cognitive load for internal apps.
- Styling: Design tokens + CSS variables for theming and SSR friendliness. Small helper CSS (CSS modules or compiled CSS) for component composition.
  - Rationale: CSS variables allow runtime theming (light/dark), small bundle, and simple SSR support.
- Packaging: Monorepo with a packages/ directory. Split into packages/tokens, packages/react-ui (components), packages/icons (if needed).
- Build: tsup or rollup for modern ESM + CJS outputs. Keep tooling minimal and well-documented.
- Docs: Storybook (v7) with CSF/MDX for interactive examples, accessibility panel, and test snapshots.
- Tests: Jest + React Testing Library for behavior, jest-axe for accessibility, Chromatic (recommended) for visual regressions. Types checked in CI.

Architecture & Component Boundaries
----------------------------------
Top-level packages (monorepo suggested layout):

packages/
- tokens/           # design tokens JSON, token -> CSS variable generator
- react-ui/         # React components (exports index.ts)
- icons/            # optional icon set
- dev-utils/        # storybook config, test-helpers, RTL wrappers

Component boundaries
- Each component lives in its own folder: src/components/<ComponentName>/
  - index.tsx (exported component)
  - <ComponentName>.tsx (implementation)
  - <ComponentName>.module.css or <ComponentName>.css (styles)
  - <ComponentName>.test.tsx (unit / accessibility tests)
  - <ComponentName>.stories.mdx (Storybook docs & examples)

Public API rules (keeps surface minimal):
- Every component exports a typed props interface
- Support className, style, data-testid, and forwardRef
- Variants via a small `variant` union prop (string literal types)
- Avoid heavy polymorphic `as` support initially — add later if needed

Component diagram (simplified)

App -> ThemeProvider -> Component
                 \-> tokens.css (CSS variables)

Sequence: Theme change (runtime)

1) User toggles theme
2) ThemeProvider updates document root CSS variables (or attached class)
3) Components read CSS variables for colors/spacing via CSS — re-render not required
4) For JS-driven variants (e.g., dynamic shadow), ThemeProvider exposes a JS theme object via context

Design Tokens & Theming
-----------------------
Tokens schema (json example):

{
  "color": {
    "background": { "base": "#ffffff", "muted": "#f7f7f8" },
    "text": { "primary": "#0f1722", "muted": "#6b7280" },
    "primary": { "default": "#0ea5a4", "contrast": "#ffffff" }
  },
  "spacing": { "1": "4px", "2": "8px", "3": "12px", "4": "16px" },
  "radius": { "sm": "4px", "md": "8px", "lg": "12px" }
}

Deliver tokens as:
- tokens/dist/tokens.json (JSON canonical)
- tokens/dist/tokens.css (CSS variables: --gstack-color-primary-default: #0ea5a4;)
- tokens/dist/index.ts exporting a typed JS object for runtime consumption

Theming provider:
- ThemeProvider accepts a theme object or name and mounts theme CSS variables to :root or a wrapper node
- Provide a useTheme() hook for components that need runtime theme values in JS

Accessibility (non-negotiable)
--------------------------------
- All interactive components must meet WCAG 2.1 AA by default
- Use semantic markup and WAI-ARIA roles when necessary
- Keyboard support: tab order, arrow keys for composite widgets (tabs, select), escape to close modals
- Focus management: focus trap for modals, return focus to trigger on close
- Tests: jest-axe for story-based accessibility tests and unit-level checks for ARIA attributes

Failure Modes & Edge Cases
--------------------------
- Missing ThemeProvider: components must have safe defaults and render with base tokens
- SSR: Ensure token CSS is available on initial HTML to avoid FOUC (emit a token CSS file and include it in server HTML)
- Z-index stacking: expose z-index tokens and document recommended portal z-index values; use portals for modals/tooltips
- Animation/transition performance: do not animate layout-heavy properties; prefer transform/opacity
- Disabled/readonly state clarity across components and forms

Testing Strategy
----------------
Test types and tooling
- Unit & integration tests: Jest + React Testing Library
- Accessibility: jest-axe run against stories and critical unit states
- Visual regression: Storybook snapshots via Chromatic or Percy
- Type tests: TypeScript compile in CI and optional tsd tests for public API shapes

Test matrix (minimum per component)
- Button: behavior (click, disabled), keyboard (enter/space), snapshot, accessibility
- Input: typing, controlled/uncontrolled, aria-labels, snapshot, accessibility
- Modal: open/close, focus trap, Esc key, portal rendering, accessibility
- Tooltip: hover/focus behaviour, positioning smoke test, accessibility

CI Pipeline (PR checks)
----------------------
On PR to main branch run:
1) Lint (eslint + stylelint) and format check
2) Typecheck (tsc)
3) Unit tests + jest-axe
4) Storybook build
5) Visual regression snapshots (optional gating or recording depending on infra)

Release & Packaging
-------------------
- Use Changesets for changelog and versioning in monorepo
- Build packages to ESM + CJS + type declarations
- Publish to private npm registry (or GitHub Packages) and update internal apps' package.json to consume workspace package during rollout

Rollout Strategy
----------------
1) Implement tokens and ThemeProvider + one canonical Button component
2) Add Storybook and CI for that component and ensure tests + visual snapshots pass
3) Iterate components in small batches (2–3 components per sprint), each with stories and tests
4) Replace components in one internal app as pilot -> fix issues -> broad rollout

Implementation Roadmap & Estimates (rough)
---------------------------------------
- Sprint 1 (week 1)
  - Create monorepo package layout, tokens package, ThemeProvider, Button (core)
  - Storybook initial config
  - CI: lint, typecheck, tests
  - Estimate: 5 engineer-days

- Sprint 2 (week 2)
  - Inputs, Checkbox, Select, basic form approach
  - Add jest-axe accessibility checks and visual snapshot integration
  - Estimate: 8 engineer-days

- Sprint 3 (week 3)
  - Modal, Tooltip, Card, Tabs
  - Finish tokens coverage and export paths
  - Estimate: 8 engineer-days

- Sprint 4 (week 4)
  - Remaining components (Table, Toast, Accordion), final polish + docs
  - Pilot integration with one internal app
  - Estimate: 8 engineer-days

Total estimated work: ~29 engineer-days (team can parallelize across 2 engineers to shorten calendar time)

Subtasks, Owners, Acceptance Criteria
------------------------------------
1) Setup: Monorepo packages, basic build tooling, storybook
   - Owner: Release Engineer
   - Estimate: 2d
   - Acceptance: packages/ layout created, storybook builds locally, CI skeleton present

2) Tokens + ThemeProvider (Light/Dark) + example injection
   - Owner: Staff Engineer
   - Estimate: 4d
   - Acceptance: tokens.json + tokens.css emitted; ThemeProvider toggles themes; example story shows both

3) Button (core) + stories + tests
   - Owner: Staff Engineer
   - Estimate: 3d
   - Acceptance: stories cover variants; unit tests + a11y checks pass; visual snapshot available

4) Inputs + Checkbox + Select
   - Owner: Engineer A
   - Estimate: 5d
   - Acceptance: stories + tests + accessibility checks

5) Modal + Tooltip + Card
   - Owner: Engineer B
   - Estimate: 5d
   - Acceptance: focus trap, portal handling, stories and tests

6) Tabs + Accordion + Table + Toast
   - Owner: Engineer A
   - Estimate: 5d
   - Acceptance: stories + tests + accessibility checks

7) Visual regression integration (Chromatic) and CI gating
   - Owner: Release Engineer
   - Estimate: 3d
   - Acceptance: snapshots are recorded against PR builds, CI can fail on visual diffs if configured

8) Pilot integration with internal app + migration notes
   - Owner: Staff Engineer + App Owner
   - Estimate: 2d
   - Acceptance: pilot app uses components, no regressions in UI, migration guide created

PR & Review Checklist (must be checked before merge)
-------------------------------------------------
- [ ] Component has TypeScript types and exported props
- [ ] Storybook stories (basic + edge states + example) included
- [ ] Unit tests cover core behaviors; accessibility checks added
- [ ] Visual snapshot added when appearance changes
- [ ] Changelog entry via Changeset
- [ ] API surface reviewed by Staff Engineer

Risk Analysis & Mitigations
--------------------------
- Risk: Theming will cause FOUC under SSR
  - Mitigation: Provide token CSS for server include and ensure ThemeProvider can emit server-side CSS during SSR
- Risk: Visual regressions may cause noise in CI
  - Mitigation: Start with recording-only mode; then enable blocking for critical components once stable
- Risk: Scope creep
  - Mitigation: Strict MVP for Phase 5 — core components only; everything else deferred to Phase 6

Next Steps (immediate)
----------------------
1) Confirm acceptance of this technical plan or request changes (one short question is fine).
2) If accepted: I'll add subtasks to Paperclip (or create task files in the repo) and assign initial work to Release Engineer to create monorepo layout and Storybook.
3) Start Sprint 1: tokens + ThemeProvider + Button.

Question
--------
Do you want me to create these subtasks in Paperclip now and assign owners, or should I only add the plan document to the repo and wait for you to assign people?
