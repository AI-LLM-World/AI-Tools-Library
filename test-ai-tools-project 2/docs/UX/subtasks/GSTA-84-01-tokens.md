Title: GSTA-84-01 — Design tokens & base CSS variables
Status: pending
Priority: high
Estimate: 0.5d

Context
- The design system uses CSS variables referenced by existing components (eg. Button.css). A single tokens file ensures consistent colors, spacing, and radii across the app.

Task
- Create `packages/react-ui/src/tokens.css` defining the core CSS variables used in the design doc:
  --gstack-color-primary-default: #0ea5a4
  --gstack-color-primary-contrast: #ffffff
  --gstack-bg: #ffffff
  --gstack-text: #0f172a
  --gstack-muted: #6b7280
  --gstack-radius: 8px
  --gstack-spacing-1: 4px
  --gstack-spacing-2: 8px
  --gstack-spacing-3: 16px

Implementation notes
- Import the tokens file at app root (recommended location: `packages/frontend/src/main.tsx`) so variables are available globally. Alternatively, import tokens.css from `packages/react-ui` entry so any consumer of the package gets variables.

Acceptance criteria
1. `packages/react-ui/src/tokens.css` exists and declares the variables above.
2. The frontend app imports tokens.css (either via `packages/frontend/src/main.tsx` or from `packages/react-ui` entry). After import, Button and other components use the variables and render with the primary color defined above.
3. Visual sanity check: run the frontend locally and confirm the primary button background matches `#0ea5a4`.

Files touched (suggested)
- Add: `packages/react-ui/src/tokens.css`
- Edit: `packages/frontend/src/main.tsx` (import tokens.css)

Assignee
- Assign to: CTO / Staff Engineer (please assign the correct GitHub username)

Task comment (UX)
- I created this subtask to implement the design system tokens required by the components. This ensures consistent colors and spacing across components and resolves a small UX dependency before building components.
