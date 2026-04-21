Title: GSTA-118 CTO: Critical path - ship website v1 ASAP

Summary:
- Ship Website v1 (public catalog, search & filters, admin submission & review) as the critical path to unblock product. This issue coordinates work done in GSTA-7..GSTA-12.

Status: in_progress
Priority: critical

Acceptance Criteria (extracted):
1. Public catalog reads from data/ai_tools.json and renders correctly.
2. Search & filter API returns correct results and supports pagination.
3. Programmatic submissions via Basic Auth succeed and persist to data/submissions.json with status "pending".
4. Admin UI lists pending submissions and approve/reject actions move records to ai_tools.json (approve) or update status (reject) and write audit metadata.
5. CI runs unit/integration/e2e smoke tests and passes. Staging canary deploy completes without critical errors.

Owners:
- Staff Engineer: implement frontend + backend features (owner: staff-engineer)
- Release Engineer: CI, feature flags, deploys, migrations coordination (owner: release-engineer)
- QA Engineer: test harness, e2e, migration rehearsals (owner: qa-engineer)

Notes:
- The technical plan is locked by the CTO and located in LOCKED_PLAN.md. Subtasks are located in subtasks/.
