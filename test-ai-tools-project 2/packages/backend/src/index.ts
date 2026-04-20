import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import crypto from "crypto";

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

// Restrict body size to mitigate large payload DoS
app.use(express.json({ limit: "64kb" }));

// Load ai_tools.json once at startup and watch for changes. Reading the
// file synchronously on every request causes performance problems and
// races if a background scraper rewrites the file. We keep a small in-
// memory cache and reload when the file is updated.
const dataPath = path.resolve(__dirname, "../../data/ai_tools.json");
const submissionsPath = path.resolve(__dirname, "../../data/submissions.json");
let allTools: any[] = [];

// last-known-good cache for ai_tools.json; used as a fallback when parsing fails
let lastGoodToolsCache: any[] = [];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireLock(filePath: string, retries = 30, delayMs = 50) {
  const lockPath = `${filePath}.lock`;

  // Allow takeover of stale locks after a configurable age to avoid permanent failures.
  const LOCK_MAX_AGE_MS = parseInt(process.env.LOCK_MAX_AGE_MS || "300000", 10); // 5 minutes default
  try {
    if (fs.existsSync(lockPath)) {
      const stat = fs.statSync(lockPath);
      if (Date.now() - stat.mtimeMs > LOCK_MAX_AGE_MS) {
        // eslint-disable-next-line no-console
        console.warn("stale lock detected, removing:", lockPath);
        try { fs.unlinkSync(lockPath); } catch (e) { /* best-effort */ }
      }
    }
  } catch (e) {
    // ignore and continue to normal acquire behavior
  }

  for (let i = 0; i < retries; i++) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      // write pid and timestamp to assist with stale-lock detection
      fs.writeSync(fd, `${process.pid}\n${Date.now()}`);
      fs.closeSync(fd);
      return lockPath;
    } catch (err: any) {
      // already locked
      if (err && (err as NodeJS.ErrnoException).code === "EEXIST") {
        // non-blocking wait
        // eslint-disable-next-line no-await-in-loop
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`failed to acquire lock for ${filePath}`);
}

function releaseLock(lockPath: string) {
  try {
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("failed to release lock", lockPath, err);
  }
}

function atomicWriteJson(filePath: string, data: any) {
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  // ensure trailing newline for readability
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", { encoding: "utf8" });

  // Try to fsync the temp file (best-effort)
  try {
    const fd = fs.openSync(tmp, "r");
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  } catch (e) {
    // best-effort
    // eslint-disable-next-line no-console
    console.warn("fsync tmp failed (best-effort):", e && e.message);
  }

  // Create a timestamped backup of existing file where possible before replace.
  // Copying the existing file (instead of renaming) keeps the original in
  // place and avoids a small window where the destination could be missing
  // for readers.
  if (fs.existsSync(filePath)) {
    const backup = `${filePath}.${Date.now()}.bak`;
    try {
      fs.copyFileSync(filePath, backup);
    } catch (err) {
      // Backups are best-effort; log and continue with the replace.
      // eslint-disable-next-line no-console
      console.warn('Failed to create backup of existing file (best-effort):', err && err.message);
    }
  }

  // Atomically move the temp file into place (should overwrite existing file).
  fs.renameSync(tmp, filePath);

  // best-effort fsync directory so rename is stable on crash
  try {
    const dfd = fs.openSync(path.dirname(filePath), "r");
    try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("fsync dir failed (best-effort):", e && e.message);
  }
}

function loadTools() {
  // Try a few quick attempts to read/parse the file. The scraper performs
  // an atomic replace that may momentarily leave the file unreadable
  // (particularly on Windows). Avoid clearing the in-memory cache on a
  // transient read/parse error to prevent returning an empty dataset to
  // clients; instead keep the last known-good data and log the failure.
  const maxAttempts = 3;
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
      allTools = parsed.filter((item: any) => item && typeof item.id === 'string' && typeof item.name === 'string');
      // update last-good cache
      lastGoodToolsCache = allTools;
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
      // otherwise a transient failure — try again immediately
    }
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
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});
