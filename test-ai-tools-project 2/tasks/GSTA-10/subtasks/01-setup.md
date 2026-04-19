title: GSTA-10.1 — Setup: Monorepo packages & Storybook
assignee: Release Engineer
estimate: 2d

Description
-----------
Create the packages/ monorepo layout, initial build tooling, and Storybook configuration so engineers have a reproducible development environment.

Acceptance Criteria
-------------------
- packages/ created with tokens/, react-ui/, dev-utils/ placeholders
- storybook config added at .storybook and runs locally (yarn storybook)
- CI skeleton: lint, typecheck steps present in pipeline config

Checklist
---------
- [ ] Create packages/ directories
- [ ] Add package.json workspaces entries
- [ ] Configure Storybook (v7) and local scripts
- [ ] Add CI job skeleton for lint & typecheck
