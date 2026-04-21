#!/usr/bin/env node
/*
 * Simple backfill script: reads data/ai_tools.json and upserts into Postgres `tools` table
 * Usage: set DATABASE_URL then run `node packages/backend/scripts/migrate_to_db.js`
 * This script is intentionally simple and idempotent (uses ON CONFLICT DO NOTHING).
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const dataPath = path.resolve(__dirname, '../../../data/ai_tools.json');
  if (!fs.existsSync(dataPath)) {
    console.warn('ai_tools.json not found at', dataPath, '- skipping tools backfill');
  } else {
    let raw;
    try {
      raw = fs.readFileSync(dataPath, 'utf8');
    } catch (err) {
      console.error('Could not read ai_tools.json:', err);
      process.exit(1);
    }

    let tools;
    try {
      tools = JSON.parse(raw);
      if (!Array.isArray(tools)) throw new Error('ai_tools.json root not array');
    } catch (err) {
      console.error('Invalid JSON in ai_tools.json:', err);
      process.exit(1);
    }

    // Ensure schema exists with recommended types/indexes for this migration run.
    // Use text[] for tags to support containment queries (tags @> ARRAY[...])
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tools (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT,
          short_description TEXT,
          website TEXT,
          tags TEXT[] NOT NULL DEFAULT '{}'::text[],
          example_use TEXT,
          created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
          published_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      -- Keep a search_vector column. For Postgres >= 12 you may prefer a
      -- GENERATED column; here we create a plain tsvector column and populate
      -- it after the import so the script works on a wider range of Postgres versions.
      search_vector tsvector
        );
      `);
      // GIN index for tags (text[])
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_tools_tags_gin ON tools USING GIN (tags)`);
      // GIN index for full-text search over search_vector
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_tools_search_vector ON tools USING GIN (search_vector)`);
      // Function-based indexes for case-insensitive filtering
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_tools_category_lower ON tools ((lower(category)))`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_tools_name_lower ON tools ((lower(name)))`);
      // Indexes to support submissions/admin workflows and audit lookups
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_submissions_status_created_at ON submissions (status, created_at DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions (created_at DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_submissions_audit_submission_id ON submissions_audit (submission_id)`);
    } catch (err) {
      console.warn('Failed to ensure migration DDL (non-fatal):', err && err.message);
    }

    for (const t of tools) {
      const id = t.id || `tool_${Math.random().toString(36).slice(2,9)}`;
      // normalize tags to lower-case text[]
      const tags = (t.tags || []).map((x) => String(x).toLowerCase());
      try {
        await pool.query(
          `INSERT INTO tools (id,name,category,short_description,website,tags,example_use,published_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now()) ON CONFLICT (id) DO NOTHING`,
          [id, t.name, t.category || null, t.short_description || null, t.website || null, tags, t.example_use || null]
        );
        console.log(`Upserted tool ${id}`);
      } catch (err) {
        console.error(`Failed to upsert ${id}:`, err && err.message);
      }
    }
  }

  // Populate search_vector for existing rows so DB text-search works even
  // when the column is a plain tsvector (not a GENERATED column).
  try {
    await pool.query("UPDATE tools SET search_vector = to_tsvector('english', coalesce(name,'') || ' ' || coalesce(short_description,'') || ' ' || coalesce(example_use,''))");
    console.log('Updated search_vector for tools');
  } catch (err) {
    console.warn('Failed to update search_vector (non-fatal):', err && err.message);
  }

  await pool.end();
  console.log('Backfill complete');
}

main().catch((err) => { console.error(err); process.exit(1); });
