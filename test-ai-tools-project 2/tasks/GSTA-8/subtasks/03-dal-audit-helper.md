title: GSTA-8.3 — DAL & audit helper
assignee: backend-engineer
priority: high
estimate: 1.5d
status: todo

Description
-----------
Implement Prisma-backed DAL wrappers that enforce tenancy and an audit helper that writes audit entries in the same transaction as resource changes.

Tasks
- Implement getProject(projectId, orgId) helper that validates ownership.
- Implement createResource(projectId, orgId, data, actorId) which creates resource and audit log in a transaction.
- Unit tests for DAL helpers.

Acceptance Criteria
- DAL wrappers exist under lib/dal and are used by route handlers.
- Tests cover tenancy checks and audit write behavior.
