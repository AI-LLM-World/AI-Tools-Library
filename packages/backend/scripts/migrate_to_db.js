// Lightweight migration script to create tables and backfill data from JSON files.
// Usage: set DATABASE_URL and run: node packages/backend/scripts/migrate_to_db.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log('Connecting to', process.env.DATABASE_URL ? 'DATABASE' : 'no DATABASE_URL');
  // Create tables (idempotent)
  await pool.query(`
  CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    short_description TEXT,
    website TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    example_use TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    published_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );
  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    short_description TEXT,
    website TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    example_use TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    review_notes TEXT
  );
  CREATE TABLE IF NOT EXISTS submissions_audit (
    id BIGSERIAL PRIMARY KEY,
    submission_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );
  `);

  // Indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tools_tags_gin ON tools USING GIN (tags)`);

  // Backfill tools from data/ai_tools.json
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const toolsPath = path.join(repoRoot, 'data', 'ai_tools.json');
  const rawTools = fs.readFileSync(toolsPath, 'utf8');
  const tools = JSON.parse(rawTools);
  console.log('Backfilling', tools.length, 'tools');
  for (const t of tools) {
    const tags = (t.tags || []).map(x => String(x).toLowerCase());
    await pool.query(`INSERT INTO tools (id,name,category,short_description,website,tags,example_use) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`, [t.id, t.name, t.category, t.short_description, t.website, tags, t.example_use]);
  }

  // Backfill submissions if file exists
  const submissionsPath = path.join(repoRoot, 'data', 'submissions.json');
  if (fs.existsSync(submissionsPath)) {
    const rawSubs = fs.readFileSync(submissionsPath, 'utf8');
    const subs = JSON.parse(rawSubs);
    console.log('Backfilling', subs.length, 'submissions');
    for (const s of subs) {
      const tags = (s.tags || []).map(x => String(x).toLowerCase());
      await pool.query(`INSERT INTO submissions (id,name,category,short_description,website,tags,example_use,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`, [s.id, s.name, s.category, s.short_description, s.website, tags, s.example_use, s.status || 'pending', s.createdAt || new Date().toISOString()]);
    }
  }

  console.log('Migration complete');
  await pool.end();
}

run().catch(err => { console.error(err); process.exit(2); });
