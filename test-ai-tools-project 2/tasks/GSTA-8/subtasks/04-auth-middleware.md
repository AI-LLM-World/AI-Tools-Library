title: GSTA-8.4 — Auth helpers & middleware
assignee: backend-engineer
priority: high
estimate: 0.5d
status: todo

Description
-----------
Implement token validation helpers and role checks.

Tasks
- Replace scaffold auth parser with JWT validation.
- Implement getUserFromToken(req) that returns user record.
- Implement role check helpers: requireOrgAdmin, requireOrgMember.

Acceptance Criteria
- Token validation implemented and covered by unit tests.
