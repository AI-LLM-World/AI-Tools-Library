GStack — Phase 1 Architecture
===============================

Purpose
-------
This document locks the technical execution plan for Phase 1 (project setup & architecture).
It is intended to be precise enough for an engineer to begin implementation and for managers to assign work.

High-level decisions (approved)
--------------------------------
- Frontend: React + TypeScript + Vite (SPA)
- Backend: Node.js + TypeScript + Express (modular services)
- ORM: Prisma
- Database: PostgreSQL
- Cache / Queue: Redis (caching + BullMQ for jobs)
- CI/CD: GitHub Actions (lint → test → build → containerize → deploy)
- Infra: Terraform skeleton for cloud resources (RDS, Redis, VPC, artifact storage)
- Observability: OpenTelemetry + Prometheus metrics + Sentry for errors
- Repo model: Monorepo (packages/frontend, packages/backend, packages/worker, infra, docs)

Component diagram (text)
------------------------

User (Browser)
  -> Frontend (React SPA)
    -> Backend API (HTTPS, Express)
      -> Auth (token validation; external IdP or internal JWT validation)
      -> Postgres (Prisma)
      -> Redis (cache + job queue)
      -> Worker (background jobs, long-running tasks)
CI/CD
  -> builds images, runs tests, deploys to staging
Monitoring
  -> traces, metrics, centralized logs, Sentry alerts

Example request flow
--------------------
1. User -> Frontend: Clicks 'list items'
2. Frontend -> Backend: GET /api/items Authorization: Bearer <token>
3. Backend: validate token (local JWKS cache)
4. Backend -> Redis: check cache
    - if miss: Backend -> Postgres (Prisma) -> read rows -> write Redis
5. Backend -> Frontend: 200 + JSON

State transitions (example: Order)
----------------------------------
- Status enum: NEW -> VALIDATED -> PROCESSING -> COMPLETED | FAILED
- Persistence: orders table with status and event_log table capturing transitions and actor
- Worker semantics: pull PROCESSING items; retry policy exponential backoff; max attempts = 3; then DLQ

Failure modes and mitigations (top risks)
-----------------------------------------
- DB outage: use managed RDS with automated backups and failover; degrade reads via cache and show maintenance page
- Redis backlog: autoscale worker pool; queue depth monitor & alerts; DLQ for aging jobs
- External IdP outage: cache keys and short-term local sign-in for admins as fallback (Phase 1: internal JWT support to unblock)
- Bad deploy: health checks, canary/staged rollout, automatic rollback on failed health probes
- Secret leak: secret scanning in CI and use of cloud secret manager or Vault; rotate credentials immediately

Testing matrix
--------------
- Unit tests: Jest (target 80%+ coverage for business logic)
- Integration tests: run against ephemeral Postgres (testcontainers or CI-provided DB)
- E2E tests: Playwright for user-critical flows (login, create resource)
- Load tests: k6 for baseline SLO verification
- Security: SAST (ESLint + security rules), dependency scanning, and DAST smoke on staging

Acceptance criteria (Phase 1)
---------------------------
1. Developer can run frontend and backend locally with a single script (make dev or npm run dev)
2. CI runs and passes on PR (lint + unit tests)
3. Staging deployment exists and a smoke endpoint returns 200
4. README + docs/ARCHITECTURE.md explain local dev, infra steps, and runbook for common failures

Notes
-----
- This document assumes a web SaaS product. If the product scope is different (native mobile, CLI, library), the stack and infra choices should be revisited.
- HEARTBEAT.md: not found in repository root during this heartbeat. Please provide the canonical HEARTBEAT.md path so this agent can comply with Paperclip API usage and subtask conventions.
