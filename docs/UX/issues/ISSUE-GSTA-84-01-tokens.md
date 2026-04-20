Title: GSTA-84-01 — Implement design tokens & base CSS variables

Description
----------
Create a centralized design tokens file for the AI Tool Library to ensure consistent colors, spacing, and radii across UI components.

Files to add
- `packages/react-ui/src/tokens.css` — define CSS variables:
  - --gstack-color-primary-default: #0ea5a4
  - --gstack-color-primary-contrast: #ffffff
  - --gstack-bg: #ffffff
  - --gstack-text: #0f172a
  - --gstack-muted: #6b7280
  - --gstack-radius: 8px
  - --gstack-spacing-1: 4px
  - --gstack-spacing-2: 8px
  - --gstack-spacing-3: 16px

Suggested edits
- Import tokens.css in `packages/react-ui` entry or `packages/frontend/src/main.tsx` so variables are globally available.

Acceptance criteria
1. `packages/react-ui/src/tokens.css` exists and declares the variables above.
2. Frontend imports tokens.css and Button renders using the primary color variable.
3. Visual sanity check: run frontend and confirm primary button background matches `#0ea5a4`.

Notes
- This is a prerequisite for component work. Assign to CTO/Staff Engineer.
