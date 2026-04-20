"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Allow configuring CORS origins via CORS_ORIGINS env (comma-separated).
// If not provided, fall back to permissive behavior for development.
const corsOriginsEnv = process.env.CORS_ORIGINS || "";
const corsOrigins = corsOriginsEnv.split(",").map((s) => s.trim()).filter(Boolean);
if (corsOrigins.length > 0) {
    app.use((0, cors_1.default)({ origin: corsOrigins }));
}
else {
    app.use((0, cors_1.default)());
}
app.use(express_1.default.json());
// Load ai_tools.json once at startup and watch for changes. Reading the
// file synchronously on every request causes performance problems and
// races if a background scraper rewrites the file. We keep a small in-
// memory cache and reload when the file is updated.
const dataPath = path_1.default.resolve(__dirname, "../../data/ai_tools.json");
let allTools = [];
const submissionsPath = path_1.default.resolve(__dirname, "../../data/submissions.json");
let submissionsCache = [];
function loadSubmissions() {
    try {
        const raw = fs_1.default.readFileSync(submissionsPath, "utf8");
        const parsed = JSON.parse(raw);
        submissionsCache = Array.isArray(parsed) ? parsed : [];
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Failed to load submissions.json, starting with empty array", err);
        submissionsCache = [];
    }
}
function writeJsonAtomic(filePath, data) {
    const tmp = filePath + ".tmp";
    fs_1.default.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
    fs_1.default.renameSync(tmp, filePath);
}
function loadTools() {
    try {
        const raw = fs_1.default.readFileSync(dataPath, "utf8");
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            console.error("ai_tools.json root is not an array, ignoring contents");
            allTools = [];
            return;
        }
        // Basic validation: ensure required fields exist. This prevents
        // runtime crashes if the file is partially written or malformed.
        allTools = parsed.filter((item) => item && typeof item.id === "string" && typeof item.name === "string");
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to load ai_tools.json:", err);
        allTools = [];
    }
}
loadTools();
loadSubmissions();
// Watch for changes and reload. Use fs.watchFile which is reliable across envs.
try {
    fs_1.default.watchFile(dataPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) {
            // eslint-disable-next-line no-console
            console.log("ai_tools.json changed on disk, reloading cache");
            loadTools();
        }
    });
}
catch (err) {
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
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to create submission", err);
        res.status(500).json({ error: "failed to create submission" });
    }
});
// Admin: list submissions (no auth in this minimal implementation)
app.get("/api/admin/submissions", (_req, res) => {
    res.json({ total: submissionsCache.length, results: submissionsCache });
});
// Admin: approve a submission by id. This will mark the submission approved and
// promote the entry into ai_tools.json if not already present.
app.post("/api/admin/submissions/:id/approve", (req, res) => {
    try {
        const id = String(req.params.id);
        const idx = submissionsCache.findIndex((s) => s.id === id);
        if (idx === -1)
            return res.status(404).json({ error: "submission not found" });
        const submission = submissionsCache[idx];
        if (submission.status === "approved")
            return res.status(400).json({ error: "already approved" });
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
                writeJsonAtomic(dataPath, allTools.concat().sort((a, b) => String(a.name).localeCompare(String(b.name))));
            }
            catch (err) {
                console.error("Failed to persist ai_tools.json", err);
                return res.status(500).json({ error: "failed to persist tools" });
            }
        }
        submissionsCache[idx] = { ...submission, status: "approved", approvedAt: new Date().toISOString() };
        writeJsonAtomic(submissionsPath, submissionsCache);
        res.json({ id: submission.id, status: "approved" });
    }
    catch (err) {
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
        let results = allTools.filter((item) => {
            // category filter
            if (category && String(item.category || "").toLowerCase() !== category.toLowerCase())
                return false;
            // tags: all provided tags must be present
            if (wantedTags.length > 0) {
                const itemTags = (item.tags || []).map((t) => t.toLowerCase());
                for (const wt of wantedTags) {
                    if (!itemTags.includes(wt))
                        return false;
                }
            }
            // text search across name and short_description
            if (q) {
                const needle = q.toLowerCase();
                const hay = String(item.name || "") + " " + String(item.short_description || "") + " " + String(item.example_use || "");
                if (!hay.toLowerCase().includes(needle))
                    return false;
            }
            return true;
        });
        // sorting
        if (sort === "name_desc") {
            results = results.sort((a, b) => String(b.name).localeCompare(String(a.name)));
        }
        else {
            // default name_asc
            results = results.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        }
        const total = results.length;
        const offset = (page - 1) * limit;
        const paged = results.slice(offset, offset + limit);
        res.json({ total, page, limit, results: paged });
    }
    catch (err) {
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
