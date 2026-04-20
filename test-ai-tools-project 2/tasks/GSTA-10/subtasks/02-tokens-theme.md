title: GSTA-10.2 — Tokens & ThemeProvider
assignee: Staff Engineer
estimate: 4d

Description
-----------
Implement design tokens package (JSON + CSS variable output) and a React ThemeProvider that mounts CSS variables and exposes a useTheme() hook.

Acceptance Criteria
-------------------
- tokens/dist/tokens.json and tokens/dist/tokens.css are generated and published in the monorepo
- ThemeProvider toggles at least light/dark themes and story demonstrates both
- Safe defaults when ThemeProvider is absent

Checklist
---------
- [ ] Implement tokens schema and build script
- [ ] Implement ThemeProvider and useTheme hook
- [ ] Add stories demonstrating theme usage
- [ ] Add unit tests for theme mounting and default behavior
