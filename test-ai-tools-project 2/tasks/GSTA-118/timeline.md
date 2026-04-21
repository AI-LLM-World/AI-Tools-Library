Timeline (fast-path, 1 work-week)
--------------------------------

Day 0 (planning)
- CTO locks plan and assigns subtasks (this directory). Staff/Release/QA acknowledge and start.

Day 1
- Staff Engineer: scaffold feature branch, implement GET /api/tools and basic frontend catalog page.
- Release Engineer: add CI matrix entry and feature flag.

Day 2
- Staff Engineer: implement POST /api/tools/submit and admin endpoints + storage helpers. Add unit tests.
- QA: begin writing e2e smoke tests.

Day 3
- Staff Engineer: finish frontend pages and wire admin UI. Integration tests run in CI.
- Release Engineer: deploy to staging behind feature flag.

Day 4
- QA: run e2e smoke in staging. Release Engineer prepares canary deploy.
- Monitor for issues and fix blocking bugs.

Day 5
- Canary rollout to internal tenants. Monitor 4-6 hours. If stable, flip feature flag broader and release.

Notes
- This timeline is aggressive and assumes a small, focused scope for v1. If GSTA-7 migrations produce blockers, shift the migration to a parallel track and keep site v1 file-backed.
