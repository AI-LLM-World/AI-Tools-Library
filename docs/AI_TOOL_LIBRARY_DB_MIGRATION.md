AI Tool Library — DB Migration & Execution Plan

Overview
- Goal: migrate the AI Tool Library from file-backed JSON to Postgres, implement safe submissions + admin approval workflows in the DB, and replace atomic file writes with transactional DB operations.
- Deliverable: schema, migration SQL, backfill scripts, backend feature-flag plan, tests, and rollout steps so Staff Engineer can implement with low risk.

Design Goals
- Preserve current semantics: search, pagination, tag AND semantics, category filtering, and name sort.
- Ensure promotions (approve) are transactional and idempotent.
- Optimize common queries (search + tags) with proper indexes (GIN + tsvector).
- Keep a safe rollout path: read-from-file fallback, feature flag, canary rollout.

Schema (Postgres)
- Two primary tables: `tools` (published catalog) and `submissions` (review queue). One lightweight audit table.

DDL (example)
```sql
-- tools: published catalog
CREATE TABLE tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  short_description TEXT,
  website TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}', -- normalized lower-case
  example_use TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(short_description,'') || ' ' || coalesce(example_use,''))
  ) STORED
);

-- submissions: incoming submissions pending review
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  short_description TEXT,
  website TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  example_use TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  review_notes TEXT
);

-- simple audit log for submissions actions
CREATE TABLE submissions_audit (
  id BIGSERIAL PRIMARY KEY,
  submission_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_tools_search_vector ON tools USING GIN (search_vector);
CREATE INDEX idx_tools_tags_gin ON tools USING GIN (tags);
CREATE INDEX idx_tools_category_lower ON tools (lower(category));
CREATE INDEX idx_tools_name_lower ON tools (lower(name));

-- Consider function-based indexes for JSONB/text fields used in filters
```

Notes on types
- `tags` uses `text[]` so containment queries are `tags @> ARRAY['tag1','tag2']::text[]`. Store tags lower-case during insert/update.
- `search_vector` gives fast full-text search across name, short_description, and example_use.

Promotion (approve) transaction
- Use a single serializable transaction or `SELECT ... FOR UPDATE` on the submission row to avoid races.
- Example logic (pseudo-SQL):
```sql
BEGIN;
SELECT status FROM submissions WHERE id = $1 FOR UPDATE;
-- if status != 'pending' then ROLLBACK; raise error
INSERT INTO tools (id, name, category, short_description, website, tags, example_use, published_at)
VALUES (...) ON CONFLICT (id) DO NOTHING;
UPDATE submissions SET status = 'approved', reviewed_at = now(), reviewed_by = $2, review_notes = $3 WHERE id = $1;
INSERT INTO submissions_audit (submission_id, action, actor, payload) VALUES ($1, 'approve', $2, jsonb_build_object('notes',$3));
COMMIT;
```

Query Patterns and Example SQL
- Translate existing API params to SQL safely.

- Text search (`q`): prefer `plainto_tsquery` against `search_vector`:
```sql
WHERE ($1 = '') OR (search_vector @@ plainto_tsquery('english', $1))
```

- Category filter:
```sql
AND ($2 = '' OR lower(category) = lower($2))
```

- Tags (AND semantics): caller sends an array of desired tags (lower-cased)
```sql
AND (array_length($3::text[],1) IS NULL OR tags @> $3::text[])
```

- Sorting & pagination:
```sql
ORDER BY CASE WHEN $4 = 'name_desc' THEN name END DESC, name ASC
LIMIT $5 OFFSET (($6 - 1) * $5)
```

- Total count: use a separate `COUNT(*)` query or window function `count(*) OVER()` if returning rows in a single query.

Backfill / Migration Plan (safe, reversible)
1. Create migration SQL that creates the `tools`, `submissions`, and `submissions_audit` tables and indexes. Keep migration idempotent.
2. Run a migration in a maintenance window against the target Postgres instance.
3. Backfill `tools` from `data/ai_tools.json` using a controlled script that normalizes tags to lower-case and inserts with `ON CONFLICT DO NOTHING`. Verify row counts and sample rows.
4. Backfill `submissions` from `data/submissions.json` similarly.
5. Run data validation queries to ensure counts match expected and spot missing/duplicate ids.
6. Deploy backend change under feature flag `USE_DB=true` that reads from DB but still writes to files when `USE_DB=false` (dual-read mode optional). Start with read-only DB usage.
7. Once read-from-DB is validated in staging/canary, enable DB writes for submissions and approval endpoints.
8. After a successful canary run, deprecate file reads/writes and remove the old file-based code path.

Example Node migration script (concept)
```js
// packages/backend/scripts/migrate_to_db.js
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function upsertTools() {
  const raw = fs.readFileSync('data/ai_tools.json','utf8');
  const tools = JSON.parse(raw);
  for (const t of tools) {
    const tags = (t.tags || []).map(x => x.toLowerCase());
    await pool.query(`INSERT INTO tools (id,name,category,short_description,website,tags,example_use) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`, [t.id, t.name, t.category, t.short_description, t.website, tags, t.example_use]);
  }
}

upsertTools().then(()=>{console.log('done'); pool.end()}).catch(e=>{console.error(e); pool.end()});
```

Backend implementation notes
- Add Postgres dependency (`pg`) and a small data-access module `packages/backend/src/db.ts` that exports parameterized queries used by the API.
- Introduce environment variables:
  - `DATABASE_URL` — Postgres connection string
  - `USE_DB` — `false` (default) while migrating; switch to `true` to read/write DB
  - `SUBMISSIONS_ADMIN_KEY` — admin API key (already implemented)
- Keep file-based implementation in place until `USE_DB=true` is flipped.

Concurrency and transactions
- For `approve` flow: `SELECT ... FOR UPDATE` the submission row, then `INSERT INTO tools ... ON CONFLICT DO NOTHING`, then `UPDATE submissions` and insert audit row in same transaction.
- Use explicit transactions; keep transaction work small to avoid long-held locks.

Edge cases & decisions
- Duplicate tool ids: current file implementation ignores duplicates; keep this behavior: if tool id exists, approval marks submission `approved` but does not overwrite the existing tool. Document this for product and create a manual remediation path for collisions.
- Tag normalization: always store tags lower-case; migration script must normalize.
- Large dataset: for huge catalogs (100k+), backfill should be batched and monitored; create indexes after bulk insert for speed if inserting many rows.

Testing matrix (minimal set)
- Unit: DB-layer functions (search, tags containment, pagination) with pg-mem or local Postgres.
- Integration: endpoint tests for
  - GET /api/tools: q, category, tags, sort, page, limit
  - POST /api/submissions: validation, persisted row, status pending
  - POST /api/admin/submissions/:id/approve: authorized vs unauthorized, approved state, tool promotion
- Concurrency: simulate two approvals in parallel for the same submission and assert idempotence.

Rollout Plan (staged)
1. Prepare migration SQL and scripts; review with Staff Engineer (code + tests).
2. Run migration in a staging environment; run integration tests.
3. Deploy backend with `USE_DB=false` and `DATABASE_URL` configured (read-from-file remains), smoke test DB reads if desired.
4. Flip `USE_DB=true` in canary subset (1-2 instances), monitor errors and user-visible counts.
5. Enable DB writes for admin endpoints; ensure `SUBMISSIONS_ADMIN_KEY` is set and rotates as needed.
6. After 48-72h of stable operation, remove file-based code and archive JSON files.

Estimated effort and owner
- Schema + migration scripts + tests: 1-2 engineer-days (Staff Engineer)
- Backend DB read/write integration + feature flag: 2-3 engineer-days (Staff Engineer)
- QA tests and CI integration: 1-2 engineer-days (QA Engineer)
- Release & rollout: 0.5-1 day (Release Engineer)

Acceptance criteria
- All existing API behaviors retained (search, pagination, tags AND semantics).
- Submissions created via POST /api/submissions are present in `submissions` table.
- Approving a submission is atomic and either inserts a tool row (if not existed) or skips insertion if a tool already exists; submissions row marked approved and audit record exists.
- Integration tests pass in CI; canary run shows no regressions.

Open questions
1. Should tags remain `text[]` or migrate to `jsonb`? Recommendation: `text[]` for simple containment queries and GIN indexing.
2. Will we require deduplication rules on `name` vs `id` collisions? (Product decision)
3. Who must be recorded as `reviewed_by` — agent id or human user id? Record whichever is available; prefer user id when available.

Next steps I can take now
1. Draft the `packages/backend/src/db.ts` skeleton and `pg` queries and a migration script (code) for Staff Engineer to review.
2. Create the SQL migration file and a Node backfill script (ready to run against a Postgres instance).

Which do you want me to do next? Draft the DB-layer code and migration script (ready-to-run), or only produce the SQL migration file and leave code changes to the Staff Engineer?
