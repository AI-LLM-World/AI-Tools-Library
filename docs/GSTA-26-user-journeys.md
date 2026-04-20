# GSTA-26 — User Journeys

Purpose
- Document core user journeys for the Catalog → Quickstart → Results flow to guide prototype, usability testing, and implementation.

Personas
- Developer (mid-level): wants to evaluate and run test tools quickly and reproduce failures locally.
- QA Engineer: wants deterministic runs and clear triage steps for flaky tests.
- DevOps Engineer: wants CI integration and reproducible CI snippets.
- Org Admin: manages tool approval and org-wide policies.

Primary Journeys
1. Developer — Discover & Quickstart (happy path)
- Steps:
  1. Open Catalog and search for a tool (type-ahead shows suggestions).
  2. Click a ToolCard Quickstart action or open Tool Detail and click Quickstart.
 3. Run preflight checks in modal; if all pass, click Run.
 4. Observe console output stream and see Success banner.
 5. Click "View Results", copy reproducible CLI, and run locally if needed.
- Success criteria:
  - User completes the flow in <10 minutes
  - Reproducible CLI copies cleanly and reproduces the run in local sample repo

2. Developer — Failure Triage & Reproduce
- Steps:
  1. Run Quickstart and observe failure in console.
  2. View Results to inspect top failures and suggested triage steps.
  3. Copy reproducible CLI and run locally; open issue or PR using provided CTA.
- Success criteria:
  - Top 3 failures are obvious and triage steps reduce time-to-diagnosis by 50% vs unaided diagnosis
  - User can reproduce the failure locally using the provided CLI in <10 minutes

3. DevOps — Add Tool to CI
- Steps:
  1. On Tool Detail, open "CI Snippets" tab.
  2. Select CI provider (GitHub Actions/GitLab/Jenkins) and copy snippet.
  3. Optionally use "Create PR" flow to open a PR that adds a minimal CI job.
- Success criteria:
  - Snippet requires minimal editing and passes in sample repo in 80% of QA tests

4. Org Admin — Approve/Manage Tools
- Steps:
  1. Open Admin Dashboard and view installed tools and pending approvals.
  2. Approve or blacklist tool; set org policies for sandbox/network.
  3. View audit logs for sandbox runs.
- Success criteria:
  - Admin can enforce sandbox/network policy and see audit logs for runs within 24 hours

Metrics to collect
- Time-to-first-successful-run (target <10 minutes for cold sandbox in 80% of QA runs)
- Task completion rate in usability test (target >= 80%)
- Time-to-reproduce locally after a failure (target <10 minutes)

Notes
- Use these journeys to scope the Figma prototype and the usability test script in ux/08_usability_test_plan.md.
