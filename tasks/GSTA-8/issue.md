title: GSTA-8 — Phase 3: Backend API routes (Next.js Route Handlers)
assignee: CTO
priority: high

Summary
-------
- Purpose: Produce a locked technical execution plan for Phase 3 — implement backend API routes as Next.js Route Handlers (app router / route.ts) that wire to the Phase 2 schema. The plan must include API contracts, tenancy and auth rules, failure modes, test coverage, monitoring, and an implementation backlog with owners and estimates so engineers can implement and deploy confidently.
- Status: locked (CTO)

Scope
-----
- Implement CRUD route handlers for Organization, User (auth), Project, Resource, and AuditLog using Next.js Route Handlers (TypeScript) under app/api.
- Tenancy: enforce organization-level tenancy via organization_id on all tenant-owned resources.
- Audit: append-only audit entries on create/update/delete with before/after JSON snapshots.
- Tests: unit, integration (with test DB), and end-to-end (API) tests.

Decisions (Locked)
-------------------
- Runtime: Next.js app router Route Handlers (app/api/...). Use route.ts (TypeScript).
- Language: TypeScript for compile-time safety and alignment with team conventions.
- Data access: Prisma as the DAL/ORM (Postgres in prod, SQLite for local CI/dev). Prisma gives a clear schema -> migration flow and is widely used.
- Validation: Zod for runtime input validation and parsing.
- Auth: JWT Bearer tokens for service-to-service and user sessions. Token identifies user_id and organization_id; middleware enforces tenancy. If product chooses OAuth/SSO later, adapters will be added.
- Concurrency: optimistic locking via a numeric `version` column or `updated_at` timestamp. On mismatch return 409 Conflict.

API Surface (contracts)
-----------------------
Notes: All endpoints require Authorization: Bearer <token> except public signup/login routes. Responses follow { success: boolean, data?: ..., error?: {code, message} }.

Auth / Session
- POST /api/auth/signup
  - Public. Body: { organization: {name}, user: {email, password, name} }
  - Creates Organization (if requested), User (owner), default Project(s). Returns { token, user, organization }

- POST /api/auth/login
  - Public. Body: { email, password }
  - Response: { token, user }

- GET /api/users/me
  - Auth required. Returns current user object.

Organizations
- GET /api/organizations
  - Auth required (platform admins). List organizations (pageable).
- GET /api/organizations/:orgId
  - Auth required (org member or admin). Return org details.
- PATCH /api/organizations/:orgId
  - Auth required (org admins). Update org metadata.

Projects
- GET /api/projects?organizationId=<id>&page=...
  - Auth required. If organizationId omitted, defaults to user's organization.
- POST /api/projects
  - Auth required (org member). Body: { name, metadata? }
- GET/PATCH/DELETE /api/projects/:projectId
  - Auth required. All operations validate org membership.

Resources
- GET /api/projects/:projectId/resources
  - List resources for project, paginated.
- POST /api/projects/:projectId/resources
  - Create resource. Body allowed fields validated by Zod; server assigns id, created_at, organization_id (from token).
- GET/PATCH/DELETE /api/resources/:id
  - Patch must supply optimistic lock token (version or updated_at). Delete is soft-delete (sets deleted_at and deleted_by).

AuditLog
- GET /api/resources/:resourceId/audit-logs
  - List audit entries for a resource. Read-only, append-only writes from server-side hooks.

Example request/response shapes (TypeScript-ish)
----------------------------------------------
type CreateResourceBody = {
  type: string
  attributes?: Record<string, unknown>
}

type ResourceDTO = {
  id: string
  projectId: string
  organizationId: string
  type: string
  attributes: Record<string, unknown>
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

Error model
- 400: { error: { code: 'invalid_input', message: string, details?: any } }
- 401: { error: { code: 'unauthorized', message } }
- 403: { error: { code: 'forbidden', message } }
- 404: { error: { code: 'not_found', message } }
- 409: { error: { code: 'conflict', message } }
- 500: generic internal error. All errors logged and traced with request id.

Tenancy & Authorization Rules (explicit)
----------------------------------------
- Tokens must include org_id and user_id. All tenant-owned endpoints enforce that resource.organization_id === token.org_id.
- Any request attempting to specify or modify organization_id is rejected unless performed by a platform-admin scope.
- Project-level endpoints require that the project's organization_id === token.org_id.
- Admin roles per org: owner/admin/member. Implement RBAC checks where necessary (create project => member+, modify org => admin+).

Audit logging
-------------
- Append-only table AuditLog(schema from Phase 2):
  - id, organization_id, resource_type, resource_id, action (create|update|delete), actor_id, before jsonb, after jsonb, created_at
- Implementation: writes happen in the same DB transaction as the resource change when supported. If audit log write fails for transient reasons, fail the outer transaction and return 500. If business requires high availability, implement a durable queue for audit writes (Release Engineer decision).

Sequence diagram (create resource)
----------------------------------
User -> NextJS Route Handler: POST /api/projects/:id/resources
Route Handler -> Auth helper: validate token, extract user/org
Route Handler -> Validation (Zod): validate body
Route Handler -> DAL (Prisma) : create resource (transaction)
DAL -> DB: insert resource
DAL -> DB: insert audit_log (before: null, after: resource)
DB -> DAL: commit
DAL -> Route Handler: resource DTO
Route Handler -> Response: 201 Created { data: resource }

Resource lifecycle state diagram
--------------------------------
created -> updated -> (soft-delete) -> archived (optional)
Events: create, update, delete (soft), archive
Each transition emits an AuditLog entry with before/after snapshots.

Concurrency
-----------
- Use optimistic locking. Add a `version` int default 1 or rely on updated_at timestamp. Update queries require `WHERE id = ? AND version = ?` and increment version in the same transaction. If rowsAffected === 0 return 409.

Validation
----------
- Use Zod schemas per endpoint to validate and coerce input. Reject unknown properties.

Failure Modes & Mitigations
--------------------------
- DB outage: return 503; circuit-breaker and retries at client/gateway layer. Monitor failed query rates.
- Audit write fails: fail the owning transaction to preserve consistency. Alternative: queue and reconcile asynchronously (trade-off: eventual consistency of audit logs).
- Cross-tenant access attempts: immediate 403 and log security event. Consider alerting on repeated attempts.
- Long-running migrations: use batching/backfill and keep schema additive where possible.

Monitoring & Metrics
--------------------
- Track per-endpoint: requests, latency p50/p95/p99, error rates (4xx/5xx).
- Track DB metrics: query durations, slow queries, transaction conflicts.
- Security: auth failures, 403 events, token misuse.
- Audit: count of audit insert failures.

Testing Plan (matrix)
---------------------
- Unit tests (Vitest/Jest): validation logic, auth helpers, small controller functions.
- Integration tests (with test DB - SQLite in-memory via Prisma): DAL functions, route handlers wired to the DB, tenancy enforcement, optimistic locking behavior.
- End-to-end tests: start a test Next.js server or use Next.js' handler invocation patterns to exercise full stack (auth -> handler -> DB). Use real migrations in test setup.
- Regression: tests for audit entries created on create/update/delete, soft-delete semantics, pagination and search.

Minimal Test Cases (representative)
- Create resource: success path, missing fields -> 400, wrong org -> 403
- Update resource: success path, stale version -> 409
- Delete resource: sets deleted_at and emits audit entry
- AuditLog read: only returns entries for token.org_id

Implementation Backlog (subtasks)
--------------------------------
1) Lock API contract & types (Staff Engineer) — 0.5d
   - Deliverable: OpenAPI-lite doc or TypeScript types + examples. Acceptance: Product sign-off on fields and flows.

2) Prisma schema & migrations (Release Engineer) — 1.0d
   - Deliverable: prisma/schema.prisma, initial migration that implements Phase 2 schema (Organization, User, Project, Resource, AuditLog).
   - Acceptance: migrations run locally and in CI; snapshot matches schema.sql from Phase 2.

3) DAL & audit helper (Backend Engineer) — 1.5d
   - Deliverable: prisma client wrappers that encapsulate tenancy checks and an audit helper to write audit entries in the same transaction.
   - Acceptance: unit tests for DAL; integration tests hitting test DB.

4) Auth helpers & middleware (Backend Engineer) — 0.5d
   - Deliverable: token validation, getUserFromToken(req) helper, role checks.

5) Route handlers (Backend Engineer) — 2.0d
   - Deliverable: Next.js route.ts files for Projects, Resources, AuditLog, Auth, Organizations with Zod validation and error mapping.
   - Acceptance: endpoints pass integration tests.

6) Tests: unit + integration + e2e (QA Engineer) — 2.0d
   - Deliverable: test suite added to CI. Integration tests run with SQLite and Prisma migrations in CI.
   - Acceptance: CI passes on PRs; coverage gates as defined by team.

7) Release runbook & staging rollout (Release Engineer) — 0.5d
   - Deliverable: migration runbook, database backup/restore plan, canary rollout plan.

8) Code review & merge (Staff Engineer) — 0.5d
   - Deliverable: PR reviewed and merged. Staff Engineer performs architecture and security review.

Total estimate: ~8.5 person-days (parallelizable across roles).

Acceptance Criteria
-------------------
1. Route handlers implemented in TypeScript under app/api with clearly named route files.
2. Prisma schema implemented and migrations run successfully against a staging DB.
3. Tenancy enforcement verified by unit/integration tests.
4. AuditLog entries are written for create/update/delete and validated by tests.
5. Integration and e2e tests pass in CI. PR reviewed by Staff Engineer.

Next steps (immediate)
----------------------
1. Staff Engineer: run product alignment meeting within 24h to lock any remaining domain-level attributes for Resource and Project. Update the API contract if needed.
2. Release Engineer: prepare prisma/schema.prisma branch and initial migration; test migrations on a staging DB snapshot.
3. Backend Engineer: after schema branch exists, scaffold app/api route handlers and DAL with a small subset (Resource create + list) to get a fast feedback loop.
4. QA Engineer: prepare test cases from the Testing Plan and add them to CI.

Notes for implementers
----------------------
- Keep changes minimal and use clear feature flags for multi-release migrations. Follow the migration strategy from Phase 2.
- Use transactions to keep resource change + audit write atomic. If using PostgreSQL, use SERIALIZABLE or repeatable read only where necessary for critical flows and be mindful of deadlocks.
- For now, prefer strict validation and fail-fast behavior.

CTO sign-off
------------
Decisions above are locked by CTO. Staff Engineer should not merge changes that deviate from the API contract without explicit product sign-off.
