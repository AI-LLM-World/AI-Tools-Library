import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Use the shared atomic file helper for consistent locking/replace semantics
// across the scraper and backend. This module is CommonJS and exported as
// a plain object, so require() is a pragmatic way to import it from TS.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fsAtomic = require('../../common/fsAtomic');

dotenv.config();

const app = express();

// Allow configuring CORS origins via CORS_ORIGINS env (comma-separated).
// In production we require an explicit CORS_ORIGINS to avoid accidentally
// serving permissive CORS; in development we fall back to permissive for
// convenience.
const corsOriginsEnv = process.env.CORS_ORIGINS || "";
const corsOrigins = corsOriginsEnv.split(",").map((s) => s.trim()).filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';
if (corsOrigins.length > 0) {
  app.use(cors({ origin: corsOrigins }));
} else if (isProduction) {
  // Fail fast in production to avoid unintentionally permissive CORS.
  // The deploy should set CORS_ORIGINS to a comma-separated list of allowed origins.
  // eslint-disable-next-line no-console
  console.error('CORS_ORIGINS is not set; refusing to start in production with permissive CORS');
  process.exit(1);
} else {
  // Development convenience: permissive CORS when no explicit origins specified.
  // eslint-disable-next-line no-console
  console.warn('CORS_ORIGINS not set, defaulting to permissive CORS (development only)');
  app.use(cors());
}

// Restrict body size to mitigate large payload DoS
app.use(express.json({ limit: "64kb" }));

// Load ai_tools.json once at startup and watch for changes. Reading the
// file synchronously on every request causes performance problems and
// races if a background scraper rewrites the file. We keep a small in-
// memory cache and reload when the file is updated. Resolve several
// common candidate locations so running from `dist`, from `src`, or
// from the repository root behave consistently in CI and dev.
const dataCandidates = [
  path.resolve(__dirname, "../../data/ai_tools.json"),
  path.resolve(__dirname, "../../../data/ai_tools.json"),
  path.resolve(process.cwd(), "data", "ai_tools.json"),
];

// Allow overriding the ai_tools.json path via environment variable so the
// scraper runner and backend can be pointed at the same file regardless of
// CWD/layout differences in CI or containers.
const envDataPath = process.env.AI_TOOLS_JSON || process.env.AI_TOOLS_PATH || "";
let dataPath = envDataPath ? path.resolve(envDataPath) : (dataCandidates.find((p) => fs.existsSync(p)) || dataCandidates[0]);
const submissionsPath = path.resolve(path.dirname(dataPath), "submissions.json");
let allTools: any[] = [];

// last-known-good cache for ai_tools.json; used as a fallback when parsing fails
let lastGoodToolsCache: any[] = [];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Use the shared helpers. Provide a tiny wrapper to preserve the
// previously exported atomicWriteJson semantics in this module.
async function atomicWriteJson(filePath: string, data: any) {
  return fsAtomic.atomicReplace(filePath, JSON.stringify(data, null, 2) + "\n");
}

async function loadTools() {
  // Try a few quick attempts to read/parse the file. The scraper performs
  // an atomic replace that may momentarily leave the file unreadable
  // (particularly on Windows). Avoid clearing the in-memory cache on a
  // transient read/parse error to prevent returning an empty dataset to
  // clients; instead keep the last known-good data and log the failure.
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const raw = fs.readFileSync(dataPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.error('ai_tools.json root is not an array, ignoring contents');
        // do not clobber the previous cache on structural errors, but return
        return;
      }

      // Basic validation: ensure required fields exist. This prevents
      // runtime crashes if the file is partially written or malformed.
      const filtered = parsed.filter((item: any) => item && typeof item.id === 'string' && typeof item.name === 'string');

      // Protect the last-known-good cache from being clobbered by a
      // transient or partial write that results in an empty/invalid set.
      // If we already have a non-empty lastGoodToolsCache, refuse to
      // replace it with an empty filtered result (likely a partial write).
      if (filtered.length === 0 && lastGoodToolsCache.length > 0) {
        console.error('ai_tools.json parsed to zero valid items; preserving last-known-good cache');
        return;
      }

      allTools = filtered;
      // update last-good cache with a shallow copy so future mutations to
      // allTools don't accidentally modify the fallback cache.
      lastGoodToolsCache = allTools.slice();
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        // eslint-disable-next-line no-console
        console.error('Failed to load ai_tools.json after retries:', err);
        // keep existing allTools (if any) to avoid serving an empty list due to a
        // transient write-related error. Caller can inspect logs and decide to
        // restart/reconcile if the file is certainly corrupted.
        return;
      }
      // otherwise a transient failure — sleep with exponential backoff and retry
      const backoffMs = 50 * Math.pow(2, attempt - 1); // 50, 100, 200, ...
      // eslint-disable-next-line no-await-in-loop
      await sleep(backoffMs);
    }
  }
}

loadTools();
// Watch for changes and reload. If the file does not exist at startup watch
// the parent directory so the file appearing later will be detected.
// Keep references to the watcher/callback so we can clean them up on shutdown.
let fsWatcher: any = null;
let fileWatchCallback: any = null;
try {
  if (fs.existsSync(dataPath)) {
    fileWatchCallback = (curr: fs.Stats, prev: fs.Stats) => {
      if (curr.mtimeMs !== prev.mtimeMs) {
        // eslint-disable-next-line no-console
        console.log("ai_tools.json changed on disk, reloading cache");
        loadTools();
      }
    };
    fs.watchFile(dataPath, { interval: 1000 }, fileWatchCallback);
  } else {
    const parent = path.dirname(dataPath);
    try {
      fsWatcher = fs.watch(parent, (eventType: string, filename: string) => {
        if (filename === path.basename(dataPath) && fs.existsSync(dataPath)) {
          // eslint-disable-next-line no-console
          console.log('ai_tools.json created in watched dir, reloading cache');
          loadTools();
        }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Could not watch data parent dir for ai_tools.json creation:', err && err.message);
    }
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn("Could not setup watcher for ai_tools.json:", err);
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from backend" });
});

// Simple tools search endpoint for Phase 6 (development implementation)
app.get("/api/tools", (req, res) => {
  try {
    // parse query params with conservative defaults and limits
    const q = String(req.query.q || "").slice(0, 200); // cap query length to avoid abuse
    const category = String(req.query.category || "");
    const tagsParam = String(req.query.tags || ""); // comma-separated
    const sort = String(req.query.sort || "name_asc");

    // Robustly parse pagination parameters and default on invalid input.
    let page = parseInt(String(req.query.page || "1"), 10);
    if (Number.isNaN(page) || page < 1) page = 1;
    let limit = parseInt(String(req.query.limit || "20"), 10);
    if (Number.isNaN(limit)) limit = 20;
    limit = Math.min(100, Math.max(1, limit));

    const wantedTags = tagsParam
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase());

    // Use in-memory cache; if empty (e.g. startup or load failure) fall back to last-good cache
    const snapshot = (allTools && allTools.length > 0) ? allTools : lastGoodToolsCache;

    // filtering against the in-memory cache
    let results = snapshot.filter((item: any) => {
      // category filter
      if (category && String(item.category || "").toLowerCase() !== category.toLowerCase()) return false;

      // tags: all provided tags must be present
      if (wantedTags.length > 0) {
        const itemTags = (item.tags || []).map((t: any) => String(t || "").toLowerCase());
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
const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});

// Graceful shutdown: close HTTP server and any file watchers so the process
// exits cleanly in containers and CI when signalled.
function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}; shutting down backend`);

  try {
    // Stop watching the files
    try {
      if (fileWatchCallback && fs.existsSync(dataPath)) fs.unwatchFile(dataPath, fileWatchCallback);
    } catch (e) {
      // best-effort
    }
    try {
      if (fsWatcher && typeof fsWatcher.close === 'function') fsWatcher.close();
    } catch (e) {
      // best-effort
    }

    // Close HTTP server (stop accepting new connections)
    if (server && typeof server.close === 'function') {
      // Allow up to 5s for connections to drain, then force exit.
      const force = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.warn('Forcing shutdown after timeout');
        process.exit(1);
      }, 5000).unref();

      server.close(() => {
        clearTimeout(force);
        // eslint-disable-next-line no-console
        console.log('Backend stopped');
        process.exit(0);
      });
      return;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error during shutdown', err && err.message ? err.message : err);
  }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled promise rejection in backend:', reason);
});
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught exception in backend:', err && err.stack ? err.stack : err);
  // give other handlers a chance to run then exit
  setTimeout(() => process.exit(1), 0);
});
