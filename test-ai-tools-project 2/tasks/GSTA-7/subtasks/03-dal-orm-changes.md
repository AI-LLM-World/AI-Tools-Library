title: GSTA-7.3  DAL / ORM changes (Backend Engineer)
owner: backend-engineer
estimate: 3d

Objective
---------
- Update the data access layer (Prisma client) and application code to match the Phase 2 schema. Add audit log insertion hooks and ensure updated_at triggers are respected.

Tasks
-----
1. Update prisma/schema.prisma (string UUIDs or native uuid) and run `prisma generate`.
2. Replace direct JSON file-backed stores with DB-backed stores for entities where applicable.
3. Implement audit helper utilities that: open a transaction, perform mutation, insert AuditLog entry, commit.
4. Add model-level tests validating ORM behavior (createdAt/updatedAt, soft delete semantics, uniqueness constraints).

Acceptance Criteria
-------------------
- Backend compiles and unit tests pass.
- Audit log entries are created atomically with data mutations in integration tests.
