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
const crypto_1 = require("crypto");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Fail-fast in production if admin key is not configured
if (process.env.NODE_ENV === 'production' && !process.env.SUBMISSIONS_ADMIN_KEY) {
    // eslint-disable-next-line no-console
    console.error('SUBMISSIONS_ADMIN_KEY must be set in production. Aborting startup.');
    process.exit(1);
}
// Require DB usage in production for submission workflows — file-backed mode is unsafe
if (process.env.NODE_ENV === 'production' && process.env.USE_DB !== 'true') {
    // eslint-disable-next-line no-console
    console.error('USE_DB must be true in production. Configure DATABASE_URL and set USE_DB=true');
    process.exit(1);
}
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
// Limit JSON body size to avoid large payload DoS attacks. 64kb is
// sufficient for submissions while preventing accidental memory OOMs.
app.use(express_1.default.json({ limit: '64kb' }));
// Simple in-memory rate limiter for submissions (best-effort). Use a proper
// distributed rate limiter (Redis, etc.) for production scale.
const submissionRateMap = new Map();
const SUBMISSION_LIMIT = Number(process.env.SUBMISSION_RATE_LIMIT || 20);
const SUBMISSION_WINDOW_MS = Number(process.env.SUBMISSION_WINDOW_MS || 10 * 60 * 1000);
// If you deploy behind a proxy, set TRUST_PROXY=true in the env so the
// application will rely on Express' req.ip (after app.set('trust proxy', true)).
const trustProxy = (process.env.TRUST_PROXY || '').toLowerCase() === 'true';
if (trustProxy) {
    // Enable Express' built-in trusted-proxy handling when explicitly configured.
    app.set('trust proxy', true);
}
// Extract client IP in a conservative, configurable way. Do NOT trust
// X-Forwarded-For unless TRUST_PROXY=true.
function getClientIp(req) {
    if (trustProxy)
        return req.ip || 'unknown';
    const header = req.headers['x-forwarded-for'];
    if (typeof header === 'string' && header.length > 0)
        return header.split(',')[0].trim();
    return (req.ip || req.connection?.remoteAddress || 'unknown');
}
function checkRateLimit(ip) {
    const now = Date.now();
    const rec = submissionRateMap.get(ip) || { count: 0, resetAt: now + SUBMISSION_WINDOW_MS };
    if (rec.resetAt <= now) {
        rec.count = 0;
        rec.resetAt = now + SUBMISSION_WINDOW_MS;
    }
    rec.count += 1;
    submissionRateMap.set(ip, rec);
    if (rec.count > SUBMISSION_LIMIT)
        return { allowed: false, retryAfter: Math.ceil((rec.resetAt - now) / 1000) };
    return { allowed: true };
}
// Periodic cleanup to avoid unbounded growth of the rate-map in long-lived
// processes. Prune entries that passed their reset window.
setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of submissionRateMap) {
        if (rec.resetAt <= now)
            submissionRateMap.delete(key);
    }
}, Math.max(60 * 1000, Math.floor(SUBMISSION_WINDOW_MS / 10)));
// Optional DB layer if USE_DB=true
const useDb = process.env.USE_DB === 'true';
let db = null;
if (useDb) {
    try {
        // require at runtime to avoid PG dependency when not used
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        // Prefer local package db if present (packaged build), fallback to repo-level shared implementation
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            db = require('./db').default;
        }
        catch (e) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            db = require('../../../../packages/backend/src/db').default;
        }
        // eslint-disable-next-line no-console
        console.log('USE_DB=true: using Postgres-backed tools API');
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('USE_DB=true but failed to load db module:', err);
        db = null;
    }
}
// Load ai_tools.json once at startup and watch for changes. Reading the
// file synchronously on every request causes performance problems and
// races if a background scraper rewrites the file. We keep a small in-
// memory cache and reload when the file is updated.
const dataPath = path_1.default.resolve(__dirname, "../../data/ai_tools.json");
let allTools = [];
function loadTools() {
    try {
        const raw = fs_1.default.readFileSync(dataPath, "utf8");
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
        const newTools = parsed.filter((item) => item && typeof item.id === "string" && typeof item.name === "string");
        allTools = newTools;
        // eslint-disable-next-line no-console
        console.log(`Loaded ${allTools.length} tools from ai_tools.json`);
    }
    catch (err) {
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
        let results = allTools.filter((item) => {
            if (category && String(item.category || "").toLowerCase() !== category.toLowerCase())
                return false;
            if (wantedTags.length > 0) {
                const itemTags = (item.tags || []).map((t) => t.toLowerCase());
                for (const wt of wantedTags) {
                    if (!itemTags.includes(wt))
                        return false;
                }
            }
            if (q) {
                const needle = q.toLowerCase();
                const hay = String(item.name || "") + " " + String(item.short_description || "") + " " + String(item.example_use || "");
                if (!hay.toLowerCase().includes(needle))
                    return false;
            }
            return true;
        });
        if (sort === "name_desc") {
            results = results.sort((a, b) => String(b.name).localeCompare(String(a.name)));
        }
        else {
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
// Submissions API (DB-backed only for now)
app.post('/api/submissions', async (req, res) => {
    if (!useDb || !db)
        return res.status(501).json({ error: 'submissions not available in file-backed mode' });
    try {
        const body = req.body || {};
        // Basic validation
        if (!body.name || typeof body.name !== 'string')
            return res.status(400).json({ error: 'name is required' });
        // rate limit by IP (best-effort). Use a conservative IP extractor.
        const ip = String(getClientIp(req));
        const rl = checkRateLimit(ip);
        if (!rl.allowed) {
            res.setHeader('Retry-After', String(rl.retryAfter));
            return res.status(429).json({ error: 'rate_limited', retryAfter: rl.retryAfter });
        }
        const id = body.id ? String(body.id).trim() : (typeof crypto_1.randomUUID === 'function' ? (0, crypto_1.randomUUID)() : `sub_${Math.random().toString(36).slice(2, 9)}`);
        if (body.id && !/^[a-z0-9\-_]{1,80}$/i.test(id))
            return res.status(400).json({ error: 'invalid id format' });
        const sub = {
            id,
            name: String(body.name).slice(0, 400),
            category: body.category || null,
            short_description: body.short_description || null,
            website: body.website || null,
            tags: (body.tags || []).map((t) => String(t).toLowerCase()).slice(0, 20),
            example_use: body.example_use || null,
            created_by: body.created_by || null,
        };
        const created = await db.insertSubmission(sub);
        if (created && created.error === 'conflict') {
            return res.status(409).json({ error: 'id conflict', id: created.id });
        }
        return res.status(201).json(created);
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        return res.status(500).json({ error: 'failed to create submission' });
    }
});
// Admin approve endpoint (DB-backed only)
app.post('/api/admin/submissions/:id/approve', async (req, res) => {
    if (!useDb || !db)
        return res.status(501).json({ error: 'admin actions not available in file-backed mode' });
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
    if (adminKey && provided !== adminKey)
        return res.status(401).json({ error: 'unauthorized' });
    try {
        const id = String(req.params.id);
        const actor = req.header('x-actor') || 'admin';
        const notes = req.body && req.body.notes ? String(req.body.notes) : null;
        const result = await db.promoteSubmission(id, actor, notes);
        // The DB layer returns { promoted: true } on success and
        // { promoted: false, reason: 'not_pending' } or { promoted: false, reason: 'not_found' }
        // for common non-success cases. Map 'not_found' to 404 and 'not_pending'
        // to 409 so callers can handle these situations appropriately.
        if (result && result.promoted === false) {
            if (result.reason === 'not_found')
                return res.status(404).json({ error: 'submission not found' });
            if (result.reason === 'not_pending')
                return res.status(409).json({ error: 'submission not pending' });
            return res.status(409).json({ error: 'submission not pending', reason: result.reason || null });
        }
        return res.json(result);
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        res.status(500).json({ error: 'failed to approve submission' });
    }
});
// Admin: list submissions (DB-backed)
app.get('/api/admin/submissions', async (req, res) => {
    if (!useDb || !db)
        return res.status(501).json({ error: 'admin actions not available in file-backed mode' });
    // Minimal auth: require SUBMISSIONS_ADMIN_KEY when set. Accept either
    // `x-admin-api-key: <key>` or `Authorization: Bearer <key>`.
    const adminKey = process.env.SUBMISSIONS_ADMIN_KEY || '';
    const providedApiKey = String(req.header('x-admin-api-key') || '').trim();
    const authHeader = String(req.header('authorization') || '').trim();
    let provided = providedApiKey;
    if (!provided && authHeader.toLowerCase().startsWith('bearer ')) {
        provided = authHeader.slice(7).trim();
    }
    if (adminKey && provided !== adminKey)
        return res.status(401).json({ error: 'unauthorized' });
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
        const status = String(req.query.status || '');
        // Use the preloaded `db` impl when available to avoid duplicating
        // module loading logic and to respect the runtime `useDb` decision.
        const dbimpl = db || require('../../../../packages/backend/src/db').default;
        const result = await dbimpl.listSubmissions({ status, page, limit });
        res.json(result);
    }
    catch (err) {
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
