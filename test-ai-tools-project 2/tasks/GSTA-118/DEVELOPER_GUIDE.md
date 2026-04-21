Developer Guide  GSTA-118 Website v1
-------------------------------------

Purpose
-------
This guide is a concise, copy-paste friendly set of instructions, helpers, and examples to help the Staff Engineer and contributors implement Website v1 fast and safely.

Branching
---------
- Create a feature branch: feat/gsta-118/site-v1
- Keep commits small and push frequently. Mark WIP PRs as Draft in GitHub until tests pass.

Environment variables (recommended)
----------------------------------
- FEATURE_GSTA_118=true|false        # gates new UI/API
- AI_TOOLS_PATH=data/ai_tools.json    # published catalog
- SUBMISSIONS_PATH=data/submissions.json
- BASIC_AUTH_CLIENTS= (see note)      # do NOT commit secrets

Notes on BASIC_AUTH_CLIENTS
- For Phase 7 we support client_id:client_secret pairs. Keep secrets out of repo. In dev you can set an env var with a JSON blob (only for local testing):

  export BASIC_AUTH_CLIENTS='[{"id":"client1","secret_hash":"$2b$..."}]'

API contract (implement these endpoints)
--------------------------------------
1) GET /api/tools
   - Query params: q (string), category, tags, page, per_page
   - Response: { total: number, items: Array<Tool> }

2) GET /api/tools/:id
   - Response: Tool

3) POST /api/tools/submit
   - Auth: Basic <base64(client_id:client_secret)>
   - Headers: X-Idempotency-Key (optional)
   - Body: {
       id?: string, name, category, short_description, website?, tags?: string[], example_use?
     }
   - Responses: 201 Created { id, status: "pending" } | 400 | 401 | 409

4) Admin-only endpoints (admin UI session required)
   - GET /api/tools/submissions?status=pending
   - POST /api/tools/submissions/:id/approve
   - POST /api/tools/submissions/:id/reject { reason }

Validation (example Zod schema)
-------------------------------
Use Zod or equivalent on the server to validate incoming payloads. Example (TypeScript):

```ts
import { z } from 'zod'

export const SubmissionSchema = z.object({
  id: z.string().regex(/^[a-z0-9\-]+$/).optional(),
  name: z.string().min(2).max(200),
  category: z.string().min(1),
  short_description: z.string().max(2000),
  website: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  example_use: z.string().optional(),
})

export type Submission = z.infer<typeof SubmissionSchema>
```

Basic Auth (server-side) - simple pattern
----------------------------------------
- Validate Basic Auth header by decoding base64 and verifying client_id and secret.
- Recommended: store hashed secrets (bcrypt) and compare. Keep secrets in environment or secret manager.

Example middleware (express-like pseudocode):

```ts
import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'

const clients = JSON.parse(process.env.BASIC_AUTH_CLIENTS || '[]')

export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers['authorization']
  if (!header || !header.startsWith('Basic ')) return res.status(401).end()
  const creds = Buffer.from(header.slice(6), 'base64').toString('utf8')
  const [id, secret] = creds.split(':')
  const client = clients.find((c: any) => c.id === id)
  if (!client) return res.status(401).end()
  const ok = bcrypt.compareSync(secret, client.secret_hash)
  if (!ok) return res.status(401).end()
  req.client_id = id
  next()
}
```

Atomic file write helper (Node.js)
---------------------------------
Write to a temp file then rename. This avoids partially written files in case of crashes.

```ts
import fs from 'fs/promises'
import path from 'path'

export async function atomicWriteJson(filePath: string, data: any) {
  const dir = path.dirname(filePath)
  const tmp = path.join(dir, `.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const json = JSON.stringify(data, null, 2)
  await fs.writeFile(tmp, json, { encoding: 'utf8' })
  // On POSIX rename is atomic. On Windows this will replace the file.
  await fs.rename(tmp, filePath)
}
```

Notes:
- Use a small in-process mutex to avoid concurrent writers in a single process. If running multiple processes, prefer single-writer worker or a queue.

Idempotency handling
--------------------
- If X-Idempotency-Key is provided, persist the response for that key in a small key store (in-memory file or data/idempotency.json) and return the stored response for subsequent identical keys.

Sanitization
------------
- Sanitize short_description and example_use on server using a trusted library (sanitize-html or DOMPurify server variant). Never store unsanitized HTML, and escape when rendering.

Search implementation (fast path)
--------------------------------
- For v1 operate on ai_tools.json: load into memory on cold-start or read-per-request and apply simple filters:
  - Full-text: simple case-insensitive substring match on name + short_description
  - Filters: category equality, tags intersection
  - Pagination: cursor or offset (keep page size default 20)

Testing
-------
- Unit tests: validation, auth, atomic write, search translator
- Integration tests: endpoints against a test harness that uses temporary data files (create and cleanup fixtures)
- E2E smoke (Playwright): submit -> admin approve -> verify public listing

Local dev workflow (suggested)
-----------------------------
1. Start backend: cd packages/backend && npm install && npm run dev
2. Start frontend: cd packages/frontend && npm install && npm run dev
3. Set env vars: FEATURE_GSTA_118=true AI_TOOLS_PATH=./data/ai_tools.json SUBMISSIONS_PATH=./data/submissions.json

PR Checklist (to include in PR description)
-------------------------------------------
- Link to tasks/GSTA-118/LOCKED_PLAN.md
- Tests: unit + integration passing; e2e smoke added
- Security: secrets not committed; sanitization in place
- Release notes: short description and rollout instructions for Release Engineer

Where to coordinate migrations (GSTA-7)
-------------------------------------
- If work requires DB changes, coordinate with the GSTA-7 owners. For v1 prefer file-backed storage to reduce migration coupling. Any DB migration should be rehearsed on staging per tasks/GSTA-7/runbook.

If you need me to create a starter PR (feature branch skeleton with README and CI stub), say so and I will create the files in the branch (I will not create commits or push branches without explicit instruction to commit/push).
