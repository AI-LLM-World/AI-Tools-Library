title: GSTA-10.7 — Visual regression integration (Chromatic)
assignee: Release Engineer
estimate: 3d

Description
-----------
Integrate visual testing tool (Chromatic or Percy) to record Storybook snapshots and optionally gate PRs on visual diffs.

Acceptance Criteria
-------------------
- Chromatic (or chosen tool) records snapshots for built Storybook
- CI job uploads snapshots during PR builds
- Team has docs for approving visual changes

Checklist
---------
- [ ] Add Chromatic config and secrets
- [ ] Add CI step to build storybook and upload
- [ ] Document visual test review flow
