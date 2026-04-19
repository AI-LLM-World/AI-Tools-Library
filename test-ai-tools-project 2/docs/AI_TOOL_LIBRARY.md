AI Tool Library - Project Documentation

Overview
- This document describes the AI Tool Library implementation in this monorepo. The library is a simple read-only catalog of AI tools backed by a JSON data file for Phase 1/Phase 2 development. It also describes the public API, data format, and admin submission workflow used by the product team.

Data
- File: data/ai_tools.json
- Format: an array of objects. Each object contains at minimum:
  - id: stable unique string id
  - name: human-friendly name
  - category: high-level category (NLP, Vision, Search, etc.)
  - short_description: one-line summary
  - website: example or vendor URL
  - tags: array of short tags
  - example_use: short example

Backend API
- Implementation: packages/backend/src/index.ts
- Endpoint: GET /api/tools

Query parameters supported
- q: free-text search applied to name, short_description, and example_use
- category: filter by category (case-insensitive exact match)
- tags: comma-separated list of tags. All tags must be present on the tool (AND semantics)
- sort: name_asc (default) or name_desc
- page: 1-based page number (default 1)
- limit: max items per page (default 20, max 100)

Response
- JSON object: { total, page, limit, results }
- results: array of tool objects (same shape as in the data file)

Client usage (example)
- Frontend: packages/frontend/src/App.tsx demonstrates a simple use of this API. It calls:
  GET http://localhost:4000/api/tools?q=...&limit=20

Admin submission / review flow (recommended next phase)
- The repo currently ships with seed data only (data/ai_tools.json). Product requires a secure submission flow that places new submissions into a review queue rather than publishing them immediately.
- Suggested data layout for Phase 2:
  - data/submissions.json: array of submission objects with status: pending|approved|rejected, createdAt, createdBy
  - On approval, the admin backend moves the entry from submissions.json into ai_tools.json (or better: promote into a DB-backed store with migrations).

Current minimal endpoints (implemented)
- POST /api/submissions
  - Public submission endpoint (minimal). Body must include `id` and `name`. The server appends the submission to data/submissions.json with status `pending` and createdAt timestamp.

- GET /api/admin/submissions
  - Admin listing of submissions. In this minimal implementation there is no auth; treat it as an internal-only endpoint.

- POST /api/admin/submissions/:id/approve
  - Admin approve endpoint. Marks the submission `approved`, sets `approvedAt`, and promotes the submission into data/ai_tools.json if a tool with the same id does not already exist. Writes files atomically.

Notes
- These endpoints are intentionally minimal for Phase 2 development. Before shipping, add authentication/authorization, audit logs, rate limiting, and migrate to a DB-backed model.

Admin auth (stopgap)
- A simple admin API key is supported via the env var `SUBMISSIONS_ADMIN_KEY`.
  - When set, admin endpoints require either header `x-admin-api-key: <key>` or `Authorization: Bearer <key>`.
  - If `SUBMISSIONS_ADMIN_KEY` is not set the admin endpoints are unprotected (development only). Do not leave this unset in production.

Security and Production Notes
- This implementation reads a JSON file from disk on every request and is intended for development and demos only. For production, migrate to a database with proper indexing and pagination.
- When implementing programmatic submissions, require authentication (OAuth2 / API keys) and rate limiting. Keep an audit log for approvals and rejections.

Testing
- Unit / API tests: add tests around packages/backend/src/index.ts to validate filtering, pagination, and tag semantics.
- End-to-end: packages/frontend has a simple integration example. Recommended e2e test: submit a tool (simulate by adding to data/submissions.json), run admin approval (script), then confirm GET /api/tools returns the new tool.

Run locally
1. Install dependencies: npm ci
2. Start backend: npm --workspace=@gstack/backend run dev
3. Start frontend: npm --workspace=@gstack/frontend run dev
4. Open http://localhost:5173 and the backend health at http://localhost:4000/health

Open questions / next steps
1. Do we want to keep file-backed seeds or migrate to a small DB (SQLite/Postgres)? Recommendation: use Postgres (already in docker-compose) and add a small migration for tools.
2. Define exact admin roles and API authentication design for programmatic submissions.
3. Add tests that exercise the full submission -> approval -> published path.

Relevant files
- packages/backend/src/index.ts - Tools API implementation
- packages/frontend/src/App.tsx - Example client usage
- data/ai_tools.json - Seed dataset
