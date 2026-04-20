import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

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

app.use(express.json());

// Simple admin authentication middleware. When SUBMISSIONS_ADMIN_KEY is set
// the admin endpoints require either header `x-admin-api-key: <key>` or
// `Authorization: Bearer <key>`. When the env var is not set we allow access
// to support local development, but this should never be the case in prod.
const submissionsAdminKey = process.env.SUBMISSIONS_ADMIN_KEY || "";
if (!submissionsAdminKey) {
  // eslint-disable-next-line no-console
  console.warn("SUBMISSIONS_ADMIN_KEY is not set — admin endpoints are UNPROTECTED (development only)");
}

function requireAdmin(req: any, res: any, next: any) {
  // If no admin key is configured, allow access in non-production environments
  // to preserve developer convenience, but block in production. Log a loud
  // warning so it's obvious when dev is running in an insecure state.
  if (!submissionsAdminKey) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'admin endpoints disabled (no admin key configured)' });
    }
    // eslint-disable-next-line no-console
    console.warn('WARNING: SUBMISSIONS_ADMIN_KEY is not set. Admin endpoints are unprotected in non-production environments.');
    return next();
  }

  const header = (req.headers['x-admin-api-key'] || req.headers['authorization'] || "") as string;
  if (!header) return res.status(401).json({ error: 'unauthorized' });
  if (header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    if (token === submissionsAdminKey) return next();
  }
  if (header === submissionsAdminKey) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

// Load ai_tools.json once at startup and watch for changes. Reading the
// file synchronously on every request causes performance problems and
// races if a background scraper rewrites the file. We keep a small in-
// memory cache and reload when the file is updated.
const dataPath = path.resolve(__dirname, "../../data/ai_tools.json");
let allTools: any[] = [];
const submissionsPath = path.resolve(__dirname, "../../data/submissions.json");
let submissionsCache: any[] = [];

function loadSubmissions() {
  try {
    const raw = fs.readFileSync(submissionsPath, "utf8");
    const parsed = JSON.parse(raw);
    submissionsCache = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Failed to load submissions.json, starting with empty array", err);
    submissionsCache = [];
  }
}

function writeJsonAtomic(filePath: string, data: any) {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

function loadTools() {
  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error("ai_tools.json root is not an array, ignoring contents");
      allTools = [];
      return;
    }

    // Prefer AJV for validation when available. If AJV is not installed,
    // fall back to a minimal validator that checks id and name.
    let validated: any[] = [];
    try {
      // eslint-disable-next-line global-require
      const Ajv = require("ajv");
      const ajv = new Ajv({ allErrors: true, strict: false });
      const itemSchema = {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          category: { type: "string" },
          short_description: { type: "string" },
          website: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          example_use: { type: "string" }
        },
        additionalProperties: true
      };

      const validateAjv = ajv.compile(itemSchema);
      for (const it of parsed) {
        if (validateAjv(it)) {
          validated.push(it);
        } else {
          // eslint-disable-next-line no-console
          console.warn("Validation failed for item id=", it && it.id, validateAjv.errors);
        }
      }
    } catch (err) {
      if (err && err.code === "MODULE_NOT_FOUND") {
        // AJV not available — fallback to minimal checks
        validated = parsed.filter((it: any) => it && typeof it.id === "string" && typeof it.name === "string");
      } else {
        throw err;
      }
    }

    if (validated.length === 0) {
      // eslint-disable-next-line no-console
      console.error("No valid items found in ai_tools.json");
      allTools = [];
    } else {
      allTools = validated;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to load ai_tools.json:", err);
    allTools = [];
  }
}

loadTools();
loadSubmissions();
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

// Rate limiter for public submissions: 10 requests per minute per IP
const submissionsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public submission endpoint (Phase 2 minimal implementation)
// Accepts a subset of fields and appends to data/submissions.json with status 'pending'.
app.post("/api/submissions", submissionsLimiter, (req, res) => {
  try {
    const body = req.body || {};
    // Minimal validation: name required, id is server-generated
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return res.status(400).json({ error: "name is required" });
    }

    const submission = {
      id: uuidv4(), // server-generated id
      name: String(body.name),
      category: body.category || "",
      short_description: body.short_description || "",
      website: body.website || "",
      tags: Array.isArray(body.tags) ? body.tags : [],
      example_use: body.example_use || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // Append to cache and persist atomically
    submissionsCache.push(submission);
    writeJsonAtomic(submissionsPath, submissionsCache);

    res.status(201).json({ id: submission.id, status: submission.status });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to create submission", err);
    res.status(500).json({ error: "failed to create submission" });
  }
});

// ----- Programmatic submissions (Basic Auth) -----
// Expected env: SUBMISSIONS_CLIENTS = JSON string mapping client_id -> client_secret
const submissionsClientsRaw = process.env.SUBMISSIONS_CLIENTS || process.env.SUBMISSION_CLIENTS || "";
let submissionsClients: Record<string, string> = {};
if (submissionsClientsRaw) {
  try {
    submissionsClients = JSON.parse(submissionsClientsRaw);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to parse SUBMISSIONS_CLIENTS env, ignoring', err);
    submissionsClients = {};
  }
}

function requireClientAuth(req: any, res: any, next: any) {
  const header = (req.headers['authorization'] || '') as string;
  if (!header || !header.startsWith('Basic ')) {
    return res.status(401).json({ error: 'invalid_auth' });
  }
  const b64 = header.slice('Basic '.length).trim();
  let decoded = '';
  try {
    decoded = Buffer.from(b64, 'base64').toString('utf8');
  } catch (err) {
    return res.status(401).json({ error: 'invalid_auth' });
  }
  const parts = decoded.split(':');
  if (parts.length < 2) return res.status(401).json({ error: 'invalid_auth' });
  const clientId = parts.shift() || '';
  const clientSecret = parts.join(':');
  const expected = submissionsClients[clientId];
  if (!expected || expected !== clientSecret) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  // attach client id for downstream handlers
  req.clientId = clientId;
  return next();
}

function isValidHttpsUrl(u: any) {
  if (!u || typeof u !== 'string') return false;
  try {
    const p = new URL(u);
    return p.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

function slugifyId(raw: string) {
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || uuidv4();
}

// POST /api/tools/submit
// Programmatic clients authenticate with Basic Auth: base64(client_id:client_secret)
app.post('/api/tools/submit', submissionsLimiter, requireClientAuth, (req, res) => {
  try {
    const clientId = req.clientId || 'unknown';
    const body = req.body || {};

    // Idempotency: if client repeats the same X-Idempotency-Key return original response
    const idemKey = String(req.headers['x-idempotency-key'] || '').trim();
    if (idemKey) {
      const existing = submissionsCache.find((s: any) => s.metadata && s.metadata.idempotencyKey === idemKey && s.submitted_by === clientId);
      if (existing) {
        return res.status(200).json({ id: existing.id, status: existing.status });
      }
    }

    // Validation
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }
    if (body.website && !isValidHttpsUrl(body.website)) {
      return res.status(400).json({ error: 'website must be a valid https URL' });
    }
    const tags = Array.isArray(body.tags) ? body.tags.filter((t: any) => typeof t === 'string').slice(0, 20) : [];

    // id handling: client may propose an id (slug); otherwise server generates uuid
    let id = '';
    if (body.id && typeof body.id === 'string' && body.id.trim() !== '') {
      id = slugifyId(body.id);
      // conflict if id exists already in submissions or tools
      const existsSub = submissionsCache.find((s: any) => String(s.id) === id);
      const existsTool = allTools.find((t: any) => String(t.id) === id);
      if (existsSub || existsTool) return res.status(409).json({ error: 'id_conflict' });
    } else {
      id = uuidv4();
    }

    const submission = {
      id,
      name: String(body.name),
      category: body.category || '',
      short_description: body.short_description || '',
      website: body.website || '',
      tags,
      example_use: body.example_use || '',
      contact_email: body.contact_email || '',
      status: 'pending',
      submitted_at: new Date().toISOString(),
      submitted_by: clientId,
      metadata: {
        idempotencyKey: idemKey || null,
        user_agent: String(req.headers['user-agent'] || ''),
        ip: req.ip || req.connection?.remoteAddress || null,
      },
    };

    submissionsCache.push(submission);
    // persist
    try {
      writeJsonAtomic(submissionsPath, submissionsCache);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to persist submission', err);
      return res.status(500).json({ error: 'failed_to_persist' });
    }

    res.status(201).location(`/api/admin/submissions/${submission.id}`).json({ id: submission.id, status: submission.status });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to accept programmatic submission', err);
    res.status(500).json({ error: 'failed' });
  }
});

// Admin: list submissions (no auth in this minimal implementation)
app.get("/api/admin/submissions", requireAdmin, (_req, res) => {
  res.json({ total: submissionsCache.length, results: submissionsCache });
});

// Admin: approve a submission by id. This will mark the submission approved and
// promote the entry into ai_tools.json if not already present.
app.post("/api/admin/submissions/:id/approve", requireAdmin, async (req, res) => {
  // Use a file lock on submissions.json to avoid concurrent approval races.
  // eslint-disable-next-line global-require
  const lockfile = require('proper-lockfile');
  let release: any = null;
  try {
    const id = String(req.params.id);

    // Acquire lock (with retries)
    try {
      release = await lockfile.lock(submissionsPath, { retries: { retries: 5, factor: 2, minTimeout: 50, maxTimeout: 200 } });
    } catch (err) {
      console.error('Could not acquire submissions lock', err);
      return res.status(503).json({ error: 'server busy, try again' });
    }

    // Re-read submissions from disk under lock
    const rawSubs = fs.readFileSync(submissionsPath, 'utf8');
    const parsedSubs = (() => { try { return JSON.parse(rawSubs); } catch (_) { return []; } })();
    const idx = parsedSubs.findIndex((s: any) => String(s.id) === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'submission not found' });
    }

    const submission = parsedSubs[idx];
    if (submission.status === 'approved') return res.status(400).json({ error: 'already approved' });

    // Promote: read ai_tools.json from disk and promote if not present
    let toolsOnDisk: any[] = [];
    try {
      const rawTools = fs.readFileSync(dataPath, 'utf8');
      const parsedTools = JSON.parse(rawTools);
      toolsOnDisk = Array.isArray(parsedTools) ? parsedTools : [];
    } catch (err) {
      toolsOnDisk = [];
    }

    const exists = toolsOnDisk.find((t) => String(t.id) === String(submission.id));
    if (!exists) {
      const tool = {
        id: submission.id,
        name: submission.name,
        category: submission.category || "",
        short_description: submission.short_description || "",
        website: submission.website || "",
        tags: submission.tags || [],
        example_use: submission.example_use || "",
      };
      toolsOnDisk.push(tool);
      try {
        writeJsonAtomic(dataPath, toolsOnDisk.concat().sort((a: any, b: any) => String(a.name).localeCompare(String(b.name))));
      } catch (err) {
        console.error('Failed to persist ai_tools.json', err);
        return res.status(500).json({ error: 'failed to persist tools' });
      }
    }

    // Mark submission approved and write back
    parsedSubs[idx] = { ...submission, status: 'approved', approvedAt: new Date().toISOString() };
    writeJsonAtomic(submissionsPath, parsedSubs);

    // Update in-memory caches (best-effort)
    loadTools();
    loadSubmissions();

    res.json({ id: submission.id, status: 'approved' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to approve submission', err);
    res.status(500).json({ error: 'failed to approve submission' });
  } finally {
    if (release) {
      try { await release(); } catch (e) { /* ignore */ }
    }
  }
});

// Simple tools search endpoint for Phase 6 (development implementation)
app.get("/api/tools", (req, res) => {
  try {
    // parse query params with conservative defaults and limits
    const q = String(req.query.q || "").slice(0, 200); // cap query length to avoid abuse
    const category = String(req.query.category || "");
    const tagsParam = String(req.query.tags || ""); // comma-separated
    const sort = String(req.query.sort || "name_asc");
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20"), 10)));

    const wantedTags = tagsParam
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase());

    // filtering against the in-memory cache
    let results = allTools.filter((item: any) => {
      // category filter
      if (category && String(item.category || "").toLowerCase() !== category.toLowerCase()) return false;

      // tags: all provided tags must be present
      if (wantedTags.length > 0) {
        const itemTags = (item.tags || []).map((t: string) => t.toLowerCase());
        for (const wt of wantedTags) {
          if (!itemTags.includes(wt)) return false;
        }
      }

      // text search across name and short_description
      if (q) {
        const needle = q.toLowerCase();
        const hay = String(item.name || "") + " " + String(item.short_description || "") + " " + String(item.example_use || "");
        if (!hay.toLowerCase().includes(needle)) return false;
      }

      return true;
    });

    // sorting
    if (sort === "name_desc") {
      results = results.sort((a: any, b: any) => String(b.name).localeCompare(String(a.name)));
    } else {
      // default name_asc
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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});
