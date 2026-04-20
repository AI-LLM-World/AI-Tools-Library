title: GSTA-11.2 — Backend - DB Migrations & Indexes
assignee: release-engineer
priority: high
estimate: 1.5d
status: todo

Description
-----------
Add DB migrations to support efficient search: tsvector column, GIN index, and pg_trgm extension where needed.

Tasks
- Create migration to add `search_vector` tsvector column and populate it from name/short_description/example_use
- Create GIN index on search_vector
- Enable pg_trgm extension and create trigram indexes for name/short_description if required for fuzzy search
- Provide offline index creation runbook for large tables (CONCURRENTLY, monitoring)
- Add rollback migration

Acceptance Criteria
- Migrations apply and rollback cleanly on test DB
- Runbook for index creation present and validated
