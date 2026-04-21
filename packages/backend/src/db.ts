import { Pool } from 'pg';

// Minimal DB layer skeleton. Staff Engineer should expand queries, add
// parameter validation, and proper error handling as part of implementation.

// Don't attempt to connect to Postgres unless USE_DB=true and DATABASE_URL is set.
const connectionString = process.env.DATABASE_URL;
const useDb = (process.env.USE_DB || '').toLowerCase() === 'true' && !!connectionString;
if (!useDb) {
  // eslint-disable-next-line no-console
  console.warn('USE_DB not enabled or DATABASE_URL missing — DB operations disabled until configured');
}

export const pool: Pool | null = useDb ? new Pool({ connectionString: connectionString as string }) : null;

export async function searchTools({ q = '', category = '', tags = [], sort = 'name_asc', page = 1, limit = 20 }: any) {
  // Assemble a safe parameterized query. We use a single query with
  // count(*) OVER() to return the total in the same round-trip as the
  // rows, avoiding a separate COUNT(*) call and risk of inconsistent
  // results between queries.
  const pageN = Math.max(1, Number(page) || 1);
  const limitN = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (pageN - 1) * limitN;

  const whereParts: string[] = [];
  const params: any[] = [];

  const qTrim = String(q || '').trim();
  const catTrim = String(category || '').trim();
  const tagsArr = Array.isArray(tags) ? tags.map((t: any) => String(t).toLowerCase()).filter(Boolean) : [];

  // Use full-text search for longer queries (>=3 chars). For very short
  // queries fall back to case-insensitive LIKE checks across common
  // searchable fields. This avoids surprising zero-results for short
  // queries while keeping the FTS path as the primary path for ranking.
  let useFTS = false;
  let ftsParamIndex: number | null = null;
  if (qTrim !== '') {
    if (qTrim.length >= 3) {
      // full-text search
      params.push(qTrim);
      ftsParamIndex = params.length; // reference this when ordering by rank
      whereParts.push(`search_vector @@ plainto_tsquery('english', $${ftsParamIndex})`);
      useFTS = true;
    } else {
      // short query fallback: case-insensitive LIKE against important fields
      params.push(qTrim);
      const idx = params.length;
      whereParts.push(`(lower(name) LIKE lower('%' || $${idx} || '%') OR lower(short_description) LIKE lower('%' || $${idx} || '%') OR lower(example_use) LIKE lower('%' || $${idx} || '%'))`);
    }
  }

  if (tagsArr.length > 0) {
    // Pass tags as a text[] for containment against the TEXT[] `tags` column.
    params.push(tagsArr);
    whereParts.push(`tags @> $${params.length}::text[]`);
  }

  if (catTrim !== '') {
    params.push(catTrim);
    whereParts.push(`lower(category) = lower($${params.length})`);
  }

  const where = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

  // Whitelist sort values to avoid SQL injection. When a relevance-based
  // sort is requested and FTS is active prefer ts_rank ordering.
  let order = 'name ASC';
  if (sort === 'name_desc') order = 'name DESC';
  else if (sort === 'relevance' && useFTS && ftsParamIndex) order = `ts_rank_cd(search_vector, plainto_tsquery('english', $${ftsParamIndex})) DESC, name ASC`;
  else if (useFTS && !['name_desc', 'name_asc'].includes(sort)) order = `ts_rank_cd(search_vector, plainto_tsquery('english', $${ftsParamIndex})) DESC, name ASC`;

  if (!pool) throw new Error('Database not configured. Set USE_DB=true and DATABASE_URL to enable DB-backed operations.');

  // Append paging params and compute their positional indexes explicitly.
  const limitParamIndex = params.length + 1;
  params.push(limitN);
  const offsetParamIndex = params.length + 1;
  params.push(offset);

  const sql = `SELECT id,name,category,short_description,website,tags,example_use, count(*) OVER() AS total_count FROM tools ${where} ORDER BY ${order} LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`;
  const { rows } = await pool.query(sql, params);
  // When rows are returned we use the windowed total_count. If the
  // page is beyond the resultset (rows.length === 0) compute an exact
  // COUNT(*) to avoid returning a misleading total=0 for existing data.
  let total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  const results = rows.map((r: any) => { const copy = { ...r }; delete copy.total_count; return copy; });

  if (rows.length === 0 && pageN > 1) {
    const countSql = `SELECT COUNT(*) AS total_count FROM tools ${where}`;
    // params had limit/offset appended at the end; remove them for the count query
    const countParams = params.slice(0, Math.max(0, params.length - 2));
    const countRes = await pool.query(countSql, countParams);
    total = parseInt(countRes.rows[0].total_count, 10) || 0;
  }

  return { total, page: pageN, limit: limitN, results };
}

export async function upsertTool(tool: any) {
  // Insert tool; tags stored as text[] in the schema. Pass JS arrays directly to node-postgres.
  const sql = `INSERT INTO tools (id,name,category,short_description,website,tags,example_use,published_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now()) ON CONFLICT (id) DO NOTHING`;
  if (!pool) throw new Error('Database not configured. Set USE_DB=true and DATABASE_URL to enable DB-backed operations.');
  const tagsArrVal = Array.isArray(tool.tags) ? tool.tags : [];
  await pool.query(sql, [tool.id, tool.name, tool.category, tool.short_description, tool.website, tagsArrVal, tool.example_use]);
}

export async function insertSubmission(sub: any) {
  // Store tags as text[] (schema uses TEXT[]). Pass JS arrays directly to node-postgres.
  const sql = `INSERT INTO submissions (id,name,category,short_description,website,tags,example_use,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING RETURNING id,status`;
  if (!pool) throw new Error('Database not configured. Set USE_DB=true and DATABASE_URL to enable DB-backed operations.');
  const tagsArrVal = Array.isArray(sub.tags) ? sub.tags : [];
  const { rows } = await pool.query(sql, [sub.id, sub.name, sub.category, sub.short_description, sub.website, tagsArrVal, sub.example_use, sub.created_by]);
  if (!rows || rows.length === 0) {
    // conflict — row already existed
    return { error: 'conflict', id: sub.id };
  }
  return rows[0];
}

export async function promoteSubmission(submissionId: string, actor: string, notes?: string) {
  if (!pool) throw new Error('Database not configured. Set USE_DB=true and DATABASE_URL to enable DB-backed operations.');
  const client = await pool.connect();
  let began = false;
  try {
    await client.query('BEGIN');
    began = true;
    const { rows } = await client.query('SELECT * FROM submissions WHERE id=$1 FOR UPDATE', [submissionId]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return { promoted: false, reason: 'not_found' };
    }
    const submission = rows[0];
    if (submission.status !== 'pending') {
      await client.query('ROLLBACK');
      return { promoted: false, reason: 'not_pending' };
    }

    // Tags are stored as a TEXT[] in the schema. Pass them as an array for pg to map.
    const tagsArrVal = Array.isArray(submission.tags) ? submission.tags : [];
    await client.query(`INSERT INTO tools (id,name,category,short_description,website,tags,example_use,published_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now()) ON CONFLICT (id) DO NOTHING`, [submission.id, submission.name, submission.category, submission.short_description, submission.website, tagsArrVal, submission.example_use]);

    await client.query('UPDATE submissions SET status=$1, reviewed_at=now(), reviewed_by=$2, review_notes=$3 WHERE id=$4', ['approved', actor, notes || null, submissionId]);

    // Insert audit row; pass JS object for JSONB parameter binding so pg knows it's JSON
    await client.query('INSERT INTO submissions_audit (submission_id,action,actor,payload) VALUES ($1,$2,$3,$4)', [submissionId, 'approve', actor, { notes: notes || null }]);

    await client.query('COMMIT');
    return { promoted: true };
  } catch (err) {
    try {
      if (began) await client.query('ROLLBACK');
    } catch (rbErr) {
      // ignore rollback errors but log in debug scenarios
      // eslint-disable-next-line no-console
      console.warn('rollback failed', rbErr && rbErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

// List submissions with pagination and optional status filter
export async function listSubmissions({ status = '', page = 1, limit = 20 }: any) {
  if (!pool) throw new Error('Database not configured. Set USE_DB=true and DATABASE_URL to enable DB-backed operations.');
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
