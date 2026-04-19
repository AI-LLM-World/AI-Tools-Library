GSTA-6 Phase 1: Project setup & architecture — Tasks
===================================================

Goal
----
Create a scaffolded monorepo, CI skeleton, infra skeleton, and locked architecture so engineers can begin implementation.

Tasks
-----
1) ARCHITECTURE doc (locked)
   - Owner: CTO
   - Estimate: 0.5 day
   - Acceptance: docs/ARCHITECTURE.md present and reviewed

2) Scaffold monorepo
   - Owner: Staff Engineer
   - Estimate: 2 days
   - Deliverables:
     - packages/frontend: React + Vite + TypeScript minimal app
     - packages/backend: Node + Express + TypeScript minimal API with /health and /api/hello
     - packages/worker: bare worker that can connect to Redis
     - dev scripts: npm/yarn workspace commands or simple makefile to start everything
   - Acceptance: developer runs `make dev` (or `npm run dev`) and reaches frontend at http://localhost:5173 and backend /health returns 200

3) Tooling & linting
   - Owner: Staff Engineer
   - Estimate: 0.5 day
   - Deliverables: tsconfig, ESLint, Prettier, husky pre-commit hook
   - Acceptance: commits blocked from adding lint errors by pre-commit hook

4) Database & ORM
   - Owner: Staff Engineer
   - Estimate: 0.5 day
   - Deliverables: Prisma schema, Docker Compose for local Postgres, migration script
   - Acceptance: backend runs migrations on `npm run migrate:dev` and connects to Postgres

5) CI skeleton
   - Owner: Release Engineer
   - Estimate: 1.5 days
   - Deliverables: GitHub Actions workflow with lint -> test -> build -> docker build (push disabled behind secret)
   - Acceptance: workflow runs on PR and passes lint + unit-test steps

6) Terraform skeleton
   - Owner: Release Engineer
   - Estimate: 2 days
   - Deliverables: terraform/ with provider config, remote state backend (example), modules for RDS and Redis, policies for secrets
   - Acceptance: `terraform init` works and plan shows resources to create (no need to apply in Phase 1)

7) Observability hooks
   - Owner: Release Engineer
   - Estimate: 1 day
   - Deliverables: OTel SDK integration (backend), basic Sentry integration sample, Prometheus metrics endpoint
   - Acceptance: /health returns headers or JSON with tracing enabled; sentry stub initialized

8) E2E smoke test
   - Owner: QA Engineer
   - Estimate: 1 day
   - Deliverables: Playwright test that hits frontend, performs login (if present), and verifies API call
   - Acceptance: test runs locally and passes against staging

9) Security checklist
   - Owner: QA / Staff
   - Estimate: 0.5 day
   - Deliverables: checklist added to docs/SECURITY.md and CI step for dependency scanning
   - Acceptance: CI job for dependency scanning is present and executed

10) Runbooks & on-call basics
    - Owner: Release Engineer
    - Estimate: 0.5 day
    - Deliverables: docs/RUNBOOK.md with recovery steps for common failures
    - Acceptance: Runbook reviewed and assigned to on-call rotation placeholder

Timeline & coordination notes
-----------------------------
- Total: ~9–10 engineer days across Staff, Release, QA. Work will be parallelized where possible.
- Early blockers: cloud credentials, secret manager access. Release Engineer should request access on day 0.
- For Phase 1 we will use an internal JWT flow to avoid IdP delays.

Next steps
----------
1. Confirm stack choices and approval to scaffold code.
2. Staff Engineer to begin scaffolding the monorepo.
3. Release Engineer to prepare Terraform remote state and cloud credentials.
