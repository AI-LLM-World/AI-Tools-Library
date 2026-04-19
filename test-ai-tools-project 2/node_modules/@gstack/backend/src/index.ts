import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();

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
  if (!submissionsAdminKey) return next();
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

// Public submission endpoint (Phase 2 minimal implementation)
// Accepts a subset of fields and appends to data/submissions.json with status 'pending'.
app.post("/api/submissions", (req, res) => {
  try {
    const body = req.body || {};
    // Minimal validation
    if (!body.id || !body.name) {
      return res.status(400).json({ error: "id and name are required" });
    }

    const submission = {
      id: String(body.id),
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

// Admin: list submissions (no auth in this minimal implementation)
app.get("/api/admin/submissions", requireAdmin, (_req, res) => {
  res.json({ total: submissionsCache.length, results: submissionsCache });
});

// Admin: approve a submission by id. This will mark the submission approved and
// promote the entry into ai_tools.json if not already present.
app.post("/api/admin/submissions/:id/approve", requireAdmin, (req, res) => {
  try {
    const id = String(req.params.id);
    const idx = submissionsCache.findIndex((s) => s.id === id);
    if (idx === -1) return res.status(404).json({ error: "submission not found" });

    const submission = submissionsCache[idx];
    if (submission.status === "approved") return res.status(400).json({ error: "already approved" });

    // Promote: ensure no duplicate tool id
    const exists = allTools.find((t) => t.id === submission.id);
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
      allTools.push(tool);
      // persist ai_tools.json atomically
      try {
        writeJsonAtomic(dataPath, allTools.concat().sort((a: any, b: any) => String(a.name).localeCompare(String(b.name))));
      } catch (err) {
        console.error("Failed to persist ai_tools.json", err);
        return res.status(500).json({ error: "failed to persist tools" });
      }
    }

    submissionsCache[idx] = { ...submission, status: "approved", approvedAt: new Date().toISOString() };
    writeJsonAtomic(submissionsPath, submissionsCache);

    res.json({ id: submission.id, status: "approved" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to approve submission", err);
    res.status(500).json({ error: "failed to approve submission" });
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
