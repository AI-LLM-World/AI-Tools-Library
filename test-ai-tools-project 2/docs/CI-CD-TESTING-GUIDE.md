CI/CD & Testing Infrastructure Guide
===================================

Status: LOCKED (CTO)

Purpose
-------
This document defines the CI/CD and testing infrastructure for the monorepo. It is a locked technical execution plan intended for the Release Engineer, Staff Engineer, and QA Engineer to implement.

TL;DR
-----
- CI platform: GitHub Actions (existing workflows present)
- Test runners: Jest (unit/integration), Playwright (E2E), jest-axe (a11y), Storybook (docs + visual snapshots)
- Builds: package builds + container images produced as artifacts
- Deploy: Terraform + cloud provider (promote artifacts from staging -> prod)
- Strategy: fast, required PR checks for lint/typecheck/unit; longer integration/E2E/visual runs on merge/nightly or label-triggered in PRs

Scope
-----
- PR checks (required): lint, typecheck, unit tests, accessibility smoke, coverage report
- Merge/main: storybook build, integration tests, smoke tests against staging
- Nightly: E2E, visual regression, perf benchmarks
- Release: build artifacts, publish packages/images, run pre-release integration and gated rollout

Pipeline Architecture (high level)
---------------------------------

Developer -> Git (PR / push) -> GitHub Actions
  - PR jobs: lint, typecheck, unit tests, storybook (optional), test-report upload
  - Merge jobs: artifact build, storybook build, integration tests, smoke
  - Release jobs: publish packages, build/push containers, terraform apply (staged with approval)

Artifacts -> Registry (npm/GitHub Packages) / Container Registry -> Deploy pipeline -> Staging -> Production

ASCII diagram
-------------

  [Developer]
       |
       | push / PR
       v
  [GitHub (repo)]
       |
       v
  [GitHub Actions]
    |-- Lint / Typecheck / Unit (fast, required on PR)
    |-- Integration / Storybook / Smoke (merge/main)
    |-- E2E / Visual / Perf (nightly or label-triggered)
       |
       v
  [Artifacts: packages + container images]
       |
       v
  [Registry] -> [Deploy (Terraform/Cloud)] -> [Staging] -> [Production]

Trust Boundaries & Secrets
--------------------------
- GitHub secrets: short-lived tokens for registries, cloud, and package publish. Never echo secrets in logs.
- Cloud secret manager (recommended): deploy-time secrets for runtime.
- Protected branches: require status checks and code owners for main/prod branches.

State transitions (PR & Release)
-------------------------------
- PR: open -> CI running -> review -> approved -> merge
- Merge: merge -> build artifacts -> run integration & smoke -> artifacts published to staging registry -> deploy to staging -> health check -> promote to prod (manual or automated canary)
- Release: tag v* -> release workflow builds artifacts, publishes packages/images, and runs pre-release checks

Failure modes & mitigations
---------------------------
- Flaky tests: mark flaky tests, add retries for transient network tests, require flaky fixes before gating visual or critical PRs.
- Long-running tests blocking PRs: use label-triggered or draft PR runs for long tests and only gate fast checks.
- Secrets leak: enable secret scanning, restrict write access to secrets, never store secrets in test fixtures.
- Build failure on main: automatic create rollback plan / revert PR template + alertting to owners.
- Test data/DB pollution: use ephemeral databases (testcontainers or docker-compose) and per-test cleanup.

Testing Strategy
----------------
- Unit tests (fast)
  - Backend: Jest. Run in PR. Command: `npm run test` (repo default).
  - Frontend: Jest + React Testing Library. Run in PR.

- Type checks
  - TypeScript compile (`tsc --noEmit`) in PR.

- Lint & formatting
  - ESLint + Prettier on PR. Pre-commit hooks recommended.

- Accessibility
  - jest-axe integration for critical stories/components. Run in PR for UI changes.

- Integration tests
  - Run against ephemeral services (Postgres, Redis) using testcontainers or docker-compose. Run on merge/main or as a parallel gated job.

- Smoke tests
  - Small end-to-end checks that verify a deployed environment's `/health` and a handful of endpoints. Exist as a separate workflow (.github/workflows/smoke.yml).

- E2E tests
  - Playwright for user flows. Run against staging (ephemeral or shared). Prefer nightly runs and on-demand PR runs (label-triggered).

- Visual regression
  - Storybook snapshots via Chromatic or Percy. Start with recording-only mode; enable gating for critical UI later.

- Performance
  - k6 or lighthouse runs nightly for key endpoints and pages.

Test matrix (recommended minimal matrix)
-------------------------------------
- packages/frontend: lint, typecheck, unit, storybook build, visual (record-only on PR), accessibility (jest-axe)
- packages/backend: lint, typecheck, unit, integration (ephemeral DB), smoke
- packages/worker: lint, unit, integration (queue semantics)

Where to run tests
------------------
- PR (fast, required): lint, typecheck, unit tests, a11y smoke
- Merge/main: storybook build, integration tests, smoke tests
- Nightly: E2E, visual regression, perf
- Release: full-suite + pre-release integration

Local developer commands (examples)
----------------------------------
- Install dependencies: `npm ci`
- Run unit tests: `npm run test`
- Run lint: `npm run lint`
- Build backend: `npm --workspace=@gstack/backend run build` (see repo-specific workspace name)
- Run smoke locally: `node scripts/ci-smoke.js`

CI Examples (copy-paste templates)
---------------------------------
The repository already contains `.github/workflows/ci.yml` and `.github/workflows/smoke.yml`. Below are minimal, ready-to-use workflow templates you can adapt. Keep secrets and registry credentials behind GitHub Secrets.

PR Checks (example)
```yaml
name: PR Checks
on: [pull_request]

jobs:
  checks:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - name: Install
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Typecheck
        run: npm run typecheck
      - name: Unit tests
        run: npm run test -- --ci --reporters=default
      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage
```

Release (tag-based) example
```yaml
name: Release
on:
  push:
    tags: ['v*.*.*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install
        run: npm ci
      - name: Build packages
        run: npm run build
      - name: Build and push Docker image
        env:
          REGISTRY: ghcr.io
          IMAGE_NAME: ghcr.io/${{ github.repository }}/app
          DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
          DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
        run: |
          echo $DOCKER_PASSWORD | docker login $REGISTRY -u $DOCKER_USERNAME --password-stdin
          docker build -t $IMAGE_NAME:${{ github.ref_name }} .
          docker push $IMAGE_NAME:${{ github.ref_name }}
      - name: Publish packages
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npm run publish
```

Notes on workflows
------------------
- Use caching (actions/cache) for npm and build artifacts to reduce run time.
- Publish artifacts (coverage, junit, storybook build) using `actions/upload-artifact` so reviewers can inspect failures.
- Prefer separate jobs for lint/typecheck (fast) so failures are visible quickly.
- Long-running tests (E2E/visual/perf) should be label-triggered or scheduled to avoid blocking PR velocity.

Observability and CI health
---------------------------
- Track: build success rate, mean run time, median queue time, flaky test count. Surface these in a lightweight dashboard or Slack channel.
- Automatic alerts: failed deploys, failing smoke on staging, high test failure rate.

Runbooks & Incident response
---------------------------
- CI fails for common reasons: dependency change, flaky test, timeout. First action: reproduce locally using the same Node version and commands; if not reproducible, run CI re-run and isolate failing tests.
- Deployment failure: do a manual rollback to the previous image using the deploy pipeline or run terraform rollback, and open an incident with owners tagged.

Acceptance Criteria for initial rollout (MVP)
-------------------------------------------
1) PR checks: lint, typecheck, unit tests run and pass on PRs.
2) Storybook builds on merge/main and is published as an artifact.
3) Smoke workflow runs successfully on staging after merge.
4) Nightly E2E scheduled job exists (can be recording-only for visual tests).

Next steps & ownership
----------------------
- Release Engineer: implement CI skeleton improvements, caching, artifact uploads, and release workflow. (Est: 2d)
- Staff Engineer: implement integration test harness (testcontainers or docker-compose) and stabilize tests. (Est: 3d)
- QA Engineer: add Playwright E2E suites and visual regression jobs (chromatic/percy integration). (Est: 3d)

If you want me to create Paperclip subtasks for these owners I can either:
1) Run the existing `scripts/create_subtasks.js` (it needs PAPERCLIP_* env vars present), or
2) Create task files in `tasks/GSTA-41/` (done) and you can run creation manually.

Appendix: repo-specific notes
----------------------------
- Existing CI: `.github/workflows/ci.yml` and `.github/workflows/smoke.yml`. The smoke workflow starts the backend and runs `scripts/ci-smoke.js` — keep that pattern for quick smoke checks.
- Storybook / visual tooling: recommend Chromatic or Percy for hosted snapshots; if you prefer self-hosted, use the storybook build artifact and a self-hosted visual diff runner.

End of guide.
