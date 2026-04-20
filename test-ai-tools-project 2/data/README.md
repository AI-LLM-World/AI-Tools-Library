AI tools seed data

Format
- data/ai_tools.json is an array of objects. Each object contains:
  - id: stable unique string id
  - name: human-friendly name
  - category: one of high-level categories (NLP, Vision, Speech, Data, Agents, Search, Analytics, Security, DevTools, Design, Finance, Productivy, Robotics, Healthcare, etc.)
  - short_description: one-line summary
  - website: example or vendor URL
  - tags: array of short tags
  - example_use: short example of how the tool is used

Suggested next steps
1. If you have an app that persists tools, write a small loader script that reads this JSON and upserts into your DB using your application's data model. Ensure you validate required fields and deduplicate by `id`.
2. If you need SQL seeds instead, convert this file to INSERT statements or a migration.
3. If you want this as fixtures for tests, import the JSON into your test setup and use factories to create DB records.

Notes
- Keep ids stable across runs to avoid creating duplicate entities. The sample dataset contains 52 entries across multiple categories.

Loader included
----------------
This repository includes a small Node-based loader at `scripts/load_ai_tools.js` that upserts the records into a Postgres database. Usage:

1. Install dependencies inside the scripts folder (from repo root):

   cd "test-ai-tools-project 2/scripts" && npm ci

2. Set `DATABASE_URL` in your environment. Example:

   export DATABASE_URL=postgres://user:pass@localhost:5432/mydb

3. Optionally create the recommended table (the loader will create it if `--create-table` is provided):

   node load_ai_tools.js --create-table

4. Run the loader (dry-run shows a sample record without mutating DB):

   node load_ai_tools.js --dry-run
   node load_ai_tools.js

What the loader does
- Validates required fields (id, name, category).
- Normalizes tags to lowercase and deduplicates them.
- Upserts by `slug` into table `ai_tools` (schema created when running with `--create-table`).
- Writes provenance metadata with source_file, import_timestamp, source_commit (if git available), and imported_by.

Recommended indexes / DDL hints
- The loader creates a minimal table when `--create-table` is passed. In production you should ensure:
  - UNIQUE index on `slug` (used for idempotent upserts)
  - Index on `category` if you filter by it
  - GIN index on `tags` (jsonb array) for tag lookups: `CREATE INDEX idx_ai_tools_tags ON ai_tools USING gin (tags);`
  - Index on `updated_at` if you filter by recent updates
