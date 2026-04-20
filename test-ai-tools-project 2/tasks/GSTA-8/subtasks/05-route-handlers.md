title: GSTA-8.5 — Route handlers
assignee: backend-engineer
priority: high
estimate: 2d
status: in_progress

Description
-----------
Implement Next.js route.ts handlers for Projects, Resources, AuditLog, Auth, Organizations.

Tasks
- Implement endpoints per contract with Zod validation and error mapping.
- Wire handlers to DAL wrappers and auth helpers.
- Add basic request/response examples in each folder.

Acceptance Criteria
- Handlers pass integration tests.

Notes
- Initial resource-level handlers (GET/PATCH/DELETE for /api/resources/:id and GET /api/resources/:id/audit-logs) and DAL helpers were scaffolded and implemented to provide a fast feedback loop. Backend Engineer to continue with Projects, Organizations, Auth endpoints and tests.
