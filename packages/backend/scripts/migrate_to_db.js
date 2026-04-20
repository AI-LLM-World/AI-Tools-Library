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

  for (const t of tools) {
    const id = t.id || `tool_${Math.random().toString(36).slice(2,9)}`;
    const tags = (t.tags || []).map((x) => String(x).toLowerCase());
    try {
      await pool.query(`INSERT INTO tools (id,name,category,short_description,website,tags,example_use,published_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now()) ON CONFLICT (id) DO NOTHING`, [id, t.name, t.category || null, t.short_description || null, t.website || null, tags, t.example_use || null]);
      console.log(`Upserted tool ${id}`);
    } catch (err) {
      console.error(`Failed to upsert ${id}:`, err);
    }
  }

  await pool.end();
  console.log('Backfill complete');
}

main().catch((err) => { console.error(err); process.exit(1); });
