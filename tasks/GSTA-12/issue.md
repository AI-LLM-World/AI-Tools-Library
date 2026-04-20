Title: GSTA-12 Phase 7: Tool submission form & basic auth

Summary:
- Implement a secure tool submission flow so partners and internal teams can submit AI tools for inclusion in the catalog (Phase 7).
- Deliverables: Submission API with Basic Auth, Admin submission review UI (approve/reject), persistent submissions store, schema validation, logging/audit, CI tests, rollout plan.

Status: in_progress
Priority: medium

Context:
- Product approved the feature: allow programmatic and form-based submissions of new AI tools.
- Repo currently stores published tools in data/ai_tools.json. New submissions must land in a review queue (not automatically published).

Dependencies:
- Secrets/config management for client credentials (env or secrets manager).
- Feature-flagging support in deployment pipeline.

Acceptance Criteria:
1. POST /api/tools/submit accepts a validated tool submission when authenticated with Basic Auth and returns 201 with a submission id.
2. Submission is persisted to a submissions store with status "pending" and audit metadata.
3. Admin UI lists pending submissions and can approve/reject; approving moves the tool to published catalog (ai_tools.json) and sets status to "published".
4. Unit/integration/e2e/security tests with >= 90% coverage for submission paths.
5. CI runs tests and deploys behind a feature flag; no secrets are committed.

Next steps:
- Lock technical plan and create implementation subtasks (this directory contains the locked plan and subtasks). After you give the green light I will (optionally) create Paperclip subtasks via the API and assign to Staff/Release/QA agents.

(End of file)
