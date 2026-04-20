import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || '';
if (!connectionString) {
  // in local dev, DATABASE_URL may be unset; callers should check USE_DB
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL not set — DB operations disabled until configured');
}

export const pool = new Pool({ connectionString });

export async function searchTools({ q = '', category = '', tags = [], sort = 'name_asc', page = 1, limit = 20 }:
  { q?: string; category?: string; tags?: string[]; sort?: string; page?: number; limit?: number }) {
  // This is a skeleton. Staff Engineer should implement parameterized queries per docs/AI_TOOL_LIBRARY_DB_MIGRATION.md
  const offset = (page - 1) * limit;
  const rows = await pool.query('SELECT id, name, category, short_description, website, tags, example_use FROM tools ORDER BY name ASC LIMIT $1 OFFSET $2', [limit, offset]);
  const count = await pool.query('SELECT COUNT(*) as cnt FROM tools');
  return { total: Number(count.rows[0].cnt), page, limit, results: rows.rows };
}

export async function closePool() {
  await pool.end();
}
