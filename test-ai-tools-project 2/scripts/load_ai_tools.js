#!/usr/bin/env node
"use strict";
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
let Pool;

function die(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const createTable = args.includes('--create-table');
const includeTests = args.includes('--include-tests');
// Locate data/ai_tools.json by walking upward from the script directory. This handles nested repo layouts.
let dataPath = null;
let cur = __dirname;
for (let i = 0; i < 5; i++) {
  const candidate = path.join(cur, '..'.repeat(i>0?i:0), 'data', 'ai_tools.json');
  // normalize
  const real = path.resolve(path.join(__dirname, '..', '..', '..', '..', '..'), candidate);
  if (fs.existsSync(candidate)) { dataPath = candidate; break; }
  if (fs.existsSync(real)) { dataPath = real; break; }
}
// Fallbacks: try repo-root relative paths
if (!dataPath) {
  const candidate = path.resolve(__dirname, '..', '..', 'data', 'ai_tools.json');
  if (fs.existsSync(candidate)) dataPath = candidate;
}
if (!dataPath) dataPath = path.join(process.cwd(), 'data', 'ai_tools.json');

if (!fs.existsSync(dataPath)) die(`Data file not found (tried multiple locations). Expected data/ai_tools.json near repo root. Last attempt: ${dataPath}`);

let items;
try {
  items = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (err) {
  die('Invalid JSON in ' + dataPath + ': ' + err.message);
}

if (!Array.isArray(items)) die('Expected top-level array in ' + dataPath);

// Basic validation
const required = ['id', 'name', 'category'];
const missing = [];
items.forEach((it, i) => {
  required.forEach((f) => { if (!it[f]) missing.push({ index: i, missing: f, id: it.id || null }); });
});
if (missing.length) {
  console.error('Validation failed: some records are missing required fields (showing up to 10)');
  console.error(JSON.stringify(missing.slice(0, 10), null, 2));
  process.exit(2);
}

// Normalize records
const normalized = items.map((it) => {
  const tags = Array.isArray(it.tags) ? Array.from(new Set(it.tags.map(t => String(t).toLowerCase().trim()))) : [];
  // Default status: if record sets status use it; otherwise treat category 'Test' as test record
  const inferredStatus = it.status || (String(it.category || '').toLowerCase() === 'test' ? 'test' : 'active');
  const metadata = {
    vendor: it.vendor || null,
    license: it.license || null,
    status: inferredStatus,
    last_updated: it.last_updated || null
  };
  return {
    slug: it.id,
    name: it.name,
    category: it.category,
    short_description: it.short_description || null,
    website: it.website || null,
    tags,
    example_use: it.example_use || null,
    metadata
  };
});

if (dryRun) {
  console.log('Dry run: would import', normalized.length, 'records');
  console.log('Sample record:');
  console.log(JSON.stringify(normalized[0], null, 2));
  process.exit(0);
}


// Only require pg when actually talking to DB so --dry-run works without dependencies
try {
  Pool = require('pg').Pool;
} catch (e) {
  die('Missing dependency: pg. Run `cd scripts && npm ci` or install pg.');
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) die('DATABASE_URL is required. Example: export DATABASE_URL=postgres://user:pass@host:5432/db');

const pool = new Pool({ connectionString });

(async () => {
  let client;
  try {
    client = await pool.connect();

    if (createTable) {
      const createSql = `CREATE TABLE IF NOT EXISTS ai_tools (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  short_description text,
  website text,
  tags jsonb,
  example_use text,
  metadata jsonb,
  provenance jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);`;
      console.log('Ensuring table ai_tools exists...');
      await client.query(createSql);
    }

    await client.query('BEGIN');

    // Try to capture commit hash for provenance, if available
    let commit = null;
    try { commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch (e) { /* ignore */ }

    let inserted = 0, updated = 0, skipped = 0;

    const upsertSql = `
INSERT INTO ai_tools (slug, name, category, short_description, website, tags, example_use, metadata, provenance, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9::jsonb,NOW(),NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  short_description = EXCLUDED.short_description,
  website = EXCLUDED.website,
  tags = EXCLUDED.tags,
  example_use = EXCLUDED.example_use,
  metadata = EXCLUDED.metadata,
  provenance = EXCLUDED.provenance,
  updated_at = NOW()
RETURNING (xmax = 0) as inserted;
`;

    // ON CONFLICT upsert. We RETURN (xmax = 0) as inserted to heuristically detect insert vs update.
    for (const rec of normalized) {
      // Skip test records by default unless explicitly included
      if (rec.metadata && String(rec.metadata.status).toLowerCase() === 'test' && !includeTests) {
        skipped++;
        continue;
      }
      const provenance = {
        source_file: path.relative(process.cwd(), dataPath),
        import_timestamp: new Date().toISOString(),
        source_commit: commit,
        imported_by: process.env.USER || process.env.USERNAME || 'loader'
      };

      const values = [
        rec.slug,
        rec.name,
        rec.category,
        rec.short_description,
        rec.website,
        JSON.stringify(rec.tags),
        rec.example_use,
        JSON.stringify(rec.metadata),
        JSON.stringify(provenance)
      ];

      const res = await client.query(upsertSql, values);
      if (res.rows && res.rows[0] && res.rows[0].inserted) inserted++; else updated++;
    }

    await client.query('COMMIT');
    console.log('Import finished. inserted=%d updated=%d total=%d', inserted, updated, normalized.length);
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (e) { /* ignore */ }
    }
    console.error('Import failed:', err.message || err);
    if (err.message && /no unique constraint/.test(err.message)) {
      console.error('It appears the ON CONFLICT target is missing. Ensure ai_tools.slug has a UNIQUE constraint or run with --create-table to create the recommended table.');
    }
    process.exit(2);
  } finally {
    if (client) client.release();
    await pool.end();
  }
})();
