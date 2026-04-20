GSTA-11 — Phase 6: Search & Filtering (Locked Execution Plan)
=============================================================

Status: in_progress
Issue: GSTA-11

This file is the locked technical execution plan for Phase 6: Search & Filtering.
It contains architecture decisions, API contract, data flow, failure modes, test matrix,
rollout steps, and ready-to-send Paperclip subtask JSON payloads and commands.

If you want me to create the Paperclip subtasks from this run, reply exactly with the word: POST
If you will run the create commands locally, reply: I WILL RUN
If you want me to stop and hand off the plan to the Staff Engineer without creating subtasks, reply: HANDOFF

1) Summary and Locked Decisions
--------------------------------
- Use Postgres built-in full-text search (tsvector) + pg_trgm extension for fuzzy matching.
- Backend API: implement a /api/tools search endpoint that accepts q, category, tags, sort, cursor/page, limit.
- Pagination: prefer cursor-based for stable ordering; offset-based supported for simple sorts (name).
- Caching: add Redis caching for hot queries (cache key = normalized query+filters+page), short TTL (30s) and cache invalidation on writes.
- Safety: validate and sanitize all query params; enforce max limit (100) and cap q length (200).

2) API Contract (server)
-------------------------
GET /api/tools

Query params:
- q: string (optional) — full-text user query, max 200 chars
- category: string (optional)
- tags: comma-separated string (optional) — semantics: all provided tags must be present (AND)
- sort: enum [name_asc, name_desc, relevance_desc] (default: name_asc)
- cursor: string (optional) — opaque cursor for cursor-based pagination
- page, limit: fallback for offset pagination (limit max 100, default 20)

Response (200):
{
  total?: number,        // optional when using cursor pagination (expensive)
  results: Tool[],
  nextCursor?: string,
  page?: number,
  limit?: number
}

Errors:
- 400 for invalid filters / page sizes
- 429 for rate limits (if applied)
- 500 for server errors

3) Query Translation (server internals)
---------------------------------------
- Translate q into Postgres to_tsquery / plainto_tsquery and use a weighted tsvector built from name (A), short_description (B), example_use (C).
- If q is short (<=3 chars) or contains non-word chars, also use ILIKE / trigram similarity fallback for better UX.
- Tags: JSONB array or normalized tags table; implement both read semantics docs — for the in-memory phase we keep AND semantics.
- Sorting: relevance_desc uses ts_rank_cd weighted by field; name sorts use localeCompare equivalent via ORDER BY name ASC/DESC.

4) Data & Migrations
---------------------
- Add a computed tsvector column `search_vector` and GIN index: CREATE INDEX ON tools USING GIN (search_vector);
- Ensure pg_trgm extension is enabled for trigram indexes if we use ILIKE similarity: CREATE EXTENSION IF NOT EXISTS pg_trgm;
- Index common filter columns (category, price_range, created_at) with appropriate btree indexes.

5) Caching and Consistency
---------------------------
- Redis keys for search: prefix "search:" + sha256(normalized_query_string)
- Short TTL (30s) and proactive warm on writes (invalidate keys containing affected tags/categories) — simplest: delete keys for short period.
- On write (create/update/delete tool), invalidate relevant cache keys and publish a Redis message for workers to evict.

6) Observability
-----------------
- Add metrics: api.search.requests, api.search.latency_ms (p95/p99), api.search.cache_hits, api.search.cache_misses, db.slow_queries
- Add tracing spans for request -> translate -> db -> cache
- Alert: p95 latency > 1s or error rate > 1% over 5m

7) Failure Modes & Mitigations
-----------------------------
- Slow DB queries: fall back to offset-limited result set and return partial results with a hint header X-Search-Degraded: true. Record telemetry.
- Malformed query: return 400 with { error: "bad_request", details: [...] }
- Cache inconsistency: short TTL plus invalidation on writes keeps inconsistency window small.

8) Tests & QA Matrix
--------------------
- Unit: translator tests mapping filters -> SQL fragments; ensure escaping and parameterization.
- Integration: run against sqlite in-memory and Postgres test DB seeded with varied data; verify correctness for q, tags, category combos, sorts.
- E2E: frontend query typing + debounced API calls, filters, pagination behavior.
- Perf: generate 1M rows and run representative queries; target p95 < 300ms on our staging infra.

9) Rollout Plan
---------------
- Feature-flag the new search API (dark launch) and route a small percentage of traffic (shadow/compare) initially.
- Monitor latency and error rate; enable cache gradually.
- After 1 week of stable metrics, fully promote to default.

10) Paperclip Subtasks (ready-to-send JSON)
------------------------------------------
Parent issue id: GSTA-11

1) GSTA-11.1 Backend - Search API (Staff Engineer)

```json
{
  "title": "GSTA-11.1 Backend - Search API",
  "description": "Implement /api/tools with q, category, tags, sort, pagination. Include query parsing, safe SQL translation to Postgres FTS, unit tests for translator, integration tests against test DB. Feature-flagged rollout and metrics.",
  "parentId": "GSTA-11",
  "assigneeAgentId": "18026214-ed65-498e-bea5-0a89bab67c01",
  "status": "todo",
  "priority": "high"
}
```

2) GSTA-11.2 Backend - DB Migrations & Indexes (Release Engineer)

```json
{
  "title": "GSTA-11.2 Backend - DB Migrations & Indexes",
  "description": "Add search_vector tsvector column, create GIN index, enable pg_trgm, and index filter columns. Provide rollback migration and runbook for large-table index creation.",
  "parentId": "GSTA-11",
  "assigneeAgentId": "c55fab5b-dc42-490e-834f-c3fe62114bc5",
  "status": "todo",
  "priority": "high"
}
```

3) GSTA-11.3 Frontend - Search UI (Staff Engineer)

```json
{
  "title": "GSTA-11.3 Frontend - Search UI",
  "description": "Add search input with debouncing, filter controls (category, tags, ranges), sort controls, and pagination. Implement accessible behavior and E2E tests.",
  "parentId": "GSTA-11",
  "assigneeAgentId": "18026214-ed65-498e-bea5-0a89bab67c01",
  "status": "todo",
  "priority": "high"
}
```

4) GSTA-11.4 QA - Test Matrix & Performance Tests (QA Engineer)

```json
{
  "title": "GSTA-11.4 QA - Test Matrix & Performance Tests",
  "description": "Create unit, integration, E2E, and performance test plans. Run performance tests on 1M seeded rows and validate P95 latency targets.",
  "parentId": "GSTA-11",
  "assigneeAgentId": "e7bc455f-035e-46c2-a88c-a0abdcfea37b",
  "status": "todo",
  "priority": "high"
}
```

11) Create commands
-------------------
PowerShell (Windows):

```powershell
$headers = @{ Authorization = "Bearer $env:PAPERCLIP_API_KEY"; "X-Paperclip-Run-Id" = $env:PAPERCLIP_RUN_ID }
$body = Get-Content './tasks/GSTA-11/subtasks_payloads.json' -Raw | ConvertFrom-Json

foreach ($b in $body) {
  Invoke-RestMethod -Uri "$env:PAPERCLIP_API_URL/api/companies/$env:PAPERCLIP_COMPANY_ID/issues" -Method Post -Headers $headers -Body ($b | ConvertTo-Json -Depth 6) -ContentType "application/json"
}
```

curl (Linux/macOS/WSL):

```bash
curl -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json" \
  -d @tasks/GSTA-11/subtasks_payloads.json
```

12) Next actions and how to instruct me
--------------------------------------
- To let me create the subtasks from this run, reply exactly: POST
- To run the PowerShell/curl commands yourself locally, reply: I WILL RUN — I'll stop retrying and remain available for questions.
- To hand off the plan and stop trying to create subtasks, reply: HANDOFF

-- End of plan
