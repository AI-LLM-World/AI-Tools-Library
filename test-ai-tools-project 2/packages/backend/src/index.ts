import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();

// Fail-fast in production if admin key is not configured
if (process.env.NODE_ENV === 'production' && !process.env.SUBMISSIONS_ADMIN_KEY) {
  // eslint-disable-next-line no-console
  console.error('SUBMISSIONS_ADMIN_KEY must be set in production. Aborting startup.');
  process.exit(1);
}

// Allow configuring CORS origins via CORS_ORIGINS env (comma-separated).
// If not provided, fall back to permissive behavior for development.
const corsOriginsEnv = process.env.CORS_ORIGINS || "";
const corsOrigins = corsOriginsEnv.split(",").map((s) => s.trim()).filter(Boolean);
if (corsOrigins.length > 0) {
  app.use(cors({ origin: corsOrigins }));
} else {
  app.use(cors());
}

// Limit JSON body size to avoid large payload DoS attacks. 64kb is
// sufficient for submissions while preventing accidental memory OOMs.
app.use(express.json({ limit: '64kb' }));

// Optional DB layer if USE_DB=true
const useDb = process.env.USE_DB === 'true';
let db: any = null;
if (useDb) {
  try {
    // require at runtime to avoid PG dependency when not used
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    db = require('./db').default;
    // eslint-disable-next-line no-console
    console.log('USE_DB=true: using Postgres-backed tools API');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('USE_DB=true but failed to load db module:', err);
    db = null;
  }
}

// Load ai_tools.json once at startup and watch for changes. Reading the
// file synchronously on every request causes performance problems and
// races if a background scraper rewrites the file. We keep a small in-
// memory cache and reload when the file is updated.
const dataPath = path.resolve(__dirname, "../../data/ai_tools.json");
let allTools: any[] = [];

function loadTools() {
  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      // If the file is malformed, keep the existing cached tools instead
      // of replacing them with an empty array. This avoids temporary
      // outages when the file is being atomically replaced by the
      // scraper (there's a brief moment where the file may be missing
      // or partially written).
      console.error("ai_tools.json root is not an array, keeping existing cached tools");
      return;
    }

    // Basic validation: ensure required fields exist. Compute a new cache
    // and swap it in atomically so we never assign a partially-validated
    // value to the shared variable.
    const newTools = parsed.filter((item: any) => item && typeof item.id === "string" && typeof item.name === "string");
    allTools = newTools;
    // eslint-disable-next-line no-console
    console.log(`Loaded ${allTools.length} tools from ai_tools.json`);
  } catch (err) {
    // Keep the existing cache on error instead of clearing it. This
    // prevents transient file-read/parse errors from turning the API
    // into an empty catalog until the next successful reload.
    // eslint-disable-next-line no-console
    console.error("Failed to load ai_tools.json; keeping existing cache:", err);
  }
}

loadTools();
// Watch for changes and reload. Use fs.watchFile which is reliable across envs.
try {
  fs.watchFile(dataPath, { interval: 1000 }, (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs) {
      // eslint-disable-next-line no-console
      console.log("ai_tools.json changed on disk, reloading cache");
      loadTools();
    }
  });
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn("Could not watch ai_tools.json for changes:", err);
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from backend" });
});

app.get("/api/tools", async (req, res) => {
  try {
    // parse query params with conservative defaults and limits
    const q = String(req.query.q || "").slice(0, 200); // cap query length to avoid abuse
    const category = String(req.query.category || "").trim();
    const tagsParam = String(req.query.tags || ""); // comma-separated
    const sort = String(req.query.sort || "name_asc");
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));

    const wantedTags = tagsParam
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase());

    if (useDb && db) {
      // Delegate to DB layer. db.searchTools expects tags array lower-cased.
      const result = await db.searchTools({ q, category, tags: wantedTags, sort, page, limit });
      res.json(result);
      return;
    }

    // fallback: in-memory file-backed behavior
    let results = allTools.filter((item: any) => {
      if (category && String(item.category || "").toLowerCase() !== category.toLowerCase()) return false;

      if (wantedTags.length > 0) {
        const itemTags = (item.tags || []).map((t: string) => t.toLowerCase());
        for (const wt of wantedTags) {
          if (!itemTags.includes(wt)) return false;
        }
      }

      if (q) {
        const needle = q.toLowerCase();
        const hay = String(item.name || "") + " " + String(item.short_description || "") + " " + String(item.example_use || "");
        if (!hay.toLowerCase().includes(needle)) return false;
      }

      return true;
    });

    if (sort === "name_desc") {
      results = results.sort((a: any, b: any) => String(b.name).localeCompare(String(a.name)));
    } else {
      results = results.sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
    }

    const total = results.length;
    const offset = (page - 1) * limit;
    const paged = results.slice(offset, offset + limit);

    res.json({ total, page, limit, results: paged });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "failed to load tools" });
  }
});

// Submissions API (DB-backed only for now)
app.post('/api/submissions', async (req, res) => {
  if (!useDb || !db) return res.status(501).json({ error: 'submissions not available in file-backed mode' });
  try {
    const body = req.body || {};
    // Basic validation; Staff Engineer should improve schema validation
    if (!body.name || typeof body.name !== 'string') return res.status(400).json({ error: 'name is required' });
    const sub = {
      id: body.id || `sub_${Math.random().toString(36).slice(2,9)}`,
      name: body.name,
      category: body.category || null,
      short_description: body.short_description || null,
      website: body.website || null,
      tags: (body.tags || []).map((t: any) => String(t).toLowerCase()),
      example_use: body.example_use || null,
      created_by: body.created_by || null,
    };
    const created = await db.insertSubmission(sub);
    res.status(201).json(created);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'failed to create submission' });
  }
});

// Admin approve endpoint (DB-backed only)
app.post('/api/admin/submissions/:id/approve', async (req, res) => {
  if (!useDb || !db) return res.status(501).json({ error: 'admin actions not available in file-backed mode' });
  // Minimal auth: require SUBMISSIONS_ADMIN_KEY when set. Accept either
  // `x-admin-api-key: <key>` or `Authorization: Bearer <key>`.
  const adminKey = process.env.SUBMISSIONS_ADMIN_KEY || '';
  const providedApiKey = String(req.header('x-admin-api-key') || '').trim();
  const authHeader = String(req.header('authorization') || '').trim();
  let provided = providedApiKey;
  if (!provided && authHeader.toLowerCase().startsWith('bearer ')) {
    provided = authHeader.slice(7).trim();
  }
  // If an admin key is configured, require a match. If no key is set
  // the API is intentionally unprotected (dev mode) and will accept the
  // request — this mirrors existing behavior but is explicit.
  if (adminKey && provided !== adminKey) return res.status(401).json({ error: 'unauthorized' });

  try {
    const id = String(req.params.id);
    const actor = req.header('x-actor') || 'admin';
    const notes = req.body && req.body.notes ? String(req.body.notes) : null;
    const result = await db.promoteSubmission(id, actor, notes);
    // The DB layer returns { promoted: true } on success and
    // { promoted: false, reason: 'not pending' } when the submission is
    // already processed. Map the latter to a 409 Conflict so callers can
    // detect races and refresh the row.
    if (result && result.promoted === false) {
      return res.status(409).json({ error: 'submission not pending', reason: result.reason || null });
    }
    return res.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'failed to approve submission' });
  }
});

// Admin: list submissions (DB-backed)
app.get('/api/admin/submissions', async (req, res) => {
  if (!useDb || !db) return res.status(501).json({ error: 'admin actions not available in file-backed mode' });
  // Minimal auth: require SUBMISSIONS_ADMIN_KEY when set. Accept either
  // `x-admin-api-key: <key>` or `Authorization: Bearer <key>`.
  const adminKey = process.env.SUBMISSIONS_ADMIN_KEY || '';
  const providedApiKey = String(req.header('x-admin-api-key') || '').trim();
  const authHeader = String(req.header('authorization') || '').trim();
  let provided = providedApiKey;
  if (!provided && authHeader.toLowerCase().startsWith('bearer ')) {
    provided = authHeader.slice(7).trim();
  }
  if (adminKey && provided !== adminKey) return res.status(401).json({ error: 'unauthorized' });

  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const status = String(req.query.status || '');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dbimpl = require('../../../../packages/backend/src/db');
    const result = await dbimpl.listSubmissions({ status, page, limit });
    res.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to list submissions', err);
    res.status(500).json({ error: 'failed to list submissions' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});
