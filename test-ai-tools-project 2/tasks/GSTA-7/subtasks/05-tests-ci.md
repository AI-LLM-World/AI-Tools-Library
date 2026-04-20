title: GSTA-7.5  Tests & CI (QA Engineer)
owner: qa-engineer
estimate: 2d

Objective
---------
- Add unit, integration, and migration tests. Ensure CI runs ephemeral Postgres, applies migrations, and runs tests.

CI Steps
--------
1. Start Postgres in CI (Docker action / testcontainers).
2. Set DATABASE_URL and run `prisma migrate deploy` (or run raw SQL migrations).
3. Run unit tests, then integration tests that exercise CRUD and audit logs.
4. On PR, require migrations to be validated (fail CI if migrations do not apply).

Tests to add
------------
- CRUD flow for Organization/User/Project/Resource
- Soft-delete behavior and active_resources view
- Audit log content for create/update/delete
- Migration up/down smoke test (if down is supported)

Acceptance Criteria
-------------------
- CI job passes and blocks merges when tests or migrations fail.
