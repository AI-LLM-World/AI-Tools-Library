import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from backend" });
});

// Simple tools search endpoint for Phase 6 (development implementation)
app.get("/api/tools", (req, res) => {
  try {
    const dataPath = path.resolve(__dirname, "../../data/ai_tools.json");
    const raw = fs.readFileSync(dataPath, "utf8");
    const all = JSON.parse(raw);

    // parse query params
    const q = (req.query.q as string | undefined) || "";
    const category = (req.query.category as string | undefined) || "";
    const tagsParam = (req.query.tags as string | undefined) || ""; // comma-separated
    const sort = (req.query.sort as string | undefined) || "name_asc";
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));

    const wantedTags = tagsParam
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase());

    // filtering
    let results = all.filter((item: any) => {
      // category filter
      if (category && item.category.toLowerCase() !== category.toLowerCase()) return false;

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
        const hay = (item.name + " " + (item.short_description || "") + " " + (item.example_use || "")).toLowerCase();
        if (!hay.includes(needle)) return false;
      }

      return true;
    });

    // sorting
    if (sort === "name_desc") {
      results = results.sort((a: any, b: any) => b.name.localeCompare(a.name));
    } else {
      // default name_asc
      results = results.sort((a: any, b: any) => a.name.localeCompare(b.name));
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
