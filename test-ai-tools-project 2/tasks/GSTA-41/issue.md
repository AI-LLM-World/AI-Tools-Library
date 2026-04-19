title: GSTA-41  Write CI/CD and Testing Infrastructure Guide
parentId: GSTA-41
assignee: Release Engineer
priority: medium

Description:
- Implement CI/CD and testing infrastructure according to docs/CI-CD-TESTING-GUIDE.md. Create the workflows, artifacts, and test harnesses described.

Acceptance criteria:
1) PR checks (lint, typecheck, unit) run on pull requests and pass on example PR.
2) Storybook builds on main and is attached as an artifact in merge workflow.
3) The smoke workflow runs against staging and reports health.
4) Nightly E2E job is scheduled (can be record-only for visual tests initially).

Deliverables:
- Updated .github/workflows/* (PR checks improvement, release workflow example added)
- Integration test harness under tests/integration
- Documentation updated (this task's doc is the source of truth)
