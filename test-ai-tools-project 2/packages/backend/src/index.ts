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
      console.error("ai_tools.json root is not an array, ignoring contents");
      allTools = [];
      return;
    }

    // Basic validation: ensure required fields exist. This prevents
    // runtime crashes if the file is partially written or malformed.
    allTools = parsed.filter((item: any) => item && typeof item.id === "string" && typeof item.name === "string");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to load ai_tools.json:", err);
    allTools = [];
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
