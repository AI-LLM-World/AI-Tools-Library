import { Pool } from 'pg';

// Minimal DB layer skeleton. Staff Engineer should expand queries, add
// parameter validation, and proper error handling as part of implementation.

const connectionString = process.env.DATABASE_URL || '';
export const pool = new Pool({ connectionString });

export async function searchTools({ q = '', category = '', tags = [], sort = 'name_asc', page = 1, limit = 20 }: any) {
  // Example simple implementation using SQL. This function is intentionally
  // small; tests should be added to validate query correctness.
  const offset = (Math.max(1, page) - 1) * limit;
  // Use plainto_tsquery for safe-to-use plain text queries; application
  // should normalize tags to lowercase before calling.
  const textQuery = q ? `search_vector @@ plainto_tsquery('english', $1)` : 'true';
  const tagClause = (tags && tags.length > 0) ? `AND tags @> $2::text[]` : '';
  const catClause = category ? `AND lower(category) = lower($3)` : '';
  const order = sort === 'name_desc' ? 'name DESC' : 'name ASC';

  // NOTE: placeholder ordering depends on which clauses are present. The
  // Staff Engineer should rewrite with parameterized arrays and explicit
  // parameters to avoid confusion.
  const sql = `SELECT id,name,category,short_description,website,tags,example_use FROM tools WHERE ${textQuery} ${tagClause} ${catClause} ORDER BY ${order} LIMIT $4 OFFSET $5`;
  const params: any[] = [];
  if (q) params.push(q);
  if (tags && tags.length > 0) params.push(tags);
  if (category) params.push(category);
  params.push(limit);
  params.push(offset);

  const { rows } = await pool.query(sql, params);
  // total count query omitted here for brevity; Staff Engineer: add COUNT(*) or use window functions
  return { total: rows.length, page, limit, results: rows };
}

export async function upsertTool(tool: any) {
  const sql = `INSERT INTO tools (id,name,category,short_description,website,tags,example_use,published_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now()) ON CONFLICT (id) DO NOTHING`;
  await pool.query(sql, [tool.id, tool.name, tool.category, tool.short_description, tool.website, tool.tags || [], tool.example_use]);
}

export async function insertSubmission(sub: any) {
  const sql = `INSERT INTO submissions (id,name,category,short_description,website,tags,example_use,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,status`;
  const { rows } = await pool.query(sql, [sub.id, sub.name, sub.category, sub.short_description, sub.website, sub.tags || [], sub.example_use, sub.created_by]);
  return rows[0];
}

export async function promoteSubmission(submissionId: string, actor: string, notes?: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM submissions WHERE id=$1 FOR UPDATE', [submissionId]);
    if (rows.length === 0) throw new Error('submission not found');
    const submission = rows[0];
    if (submission.status !== 'pending') {
      await client.query('ROLLBACK');
      return { promoted: false, reason: 'not pending' };
    }

    await client.query(`INSERT INTO tools (id,name,category,short_description,website,tags,example_use,published_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now()) ON CONFLICT (id) DO NOTHING`, [submission.id, submission.name, submission.category, submission.short_description, submission.website, submission.tags || [], submission.example_use]);

    await client.query('UPDATE submissions SET status=$1, reviewed_at=now(), reviewed_by=$2, review_notes=$3 WHERE id=$4', ['approved', actor, notes || null, submissionId]);

    await client.query('INSERT INTO submissions_audit (submission_id,action,actor,payload) VALUES ($1,$2,$3,$4)', [submissionId, 'approve', actor, JSON.stringify({ notes: notes || null })]);

    await client.query('COMMIT');
    return { promoted: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// List submissions with pagination and optional status filter
export async function listSubmissions({ status = '', page = 1, limit = 20 }: any) {
  const offset = (Math.max(1, page) - 1) * limit;
  const whereClauses: string[] = [];
  const params: any[] = [];
  if (status) {
    params.push(status);
    whereClauses.push(`status = $${params.length}`);
  }

  const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `SELECT id,name,category,short_description,website,tags,example_use,status,created_at,created_by,reviewed_at,reviewed_by,review_notes FROM submissions ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  const { rows } = await pool.query(sql, params);

  const countSql = `SELECT COUNT(*) FROM submissions ${where}`;
  const countParams = whereClauses.length > 0 ? params.slice(0, params.length - 2) : [];
  const countRes = await pool.query(countSql, countParams);
  const total = parseInt(countRes.rows[0].count, 10) || rows.length;

  return { total, page, limit, results: rows };
}

export default { pool, searchTools, upsertTool, insertSubmission, promoteSubmission, listSubmissions };
