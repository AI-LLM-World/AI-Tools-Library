title: GSTA-118.2  Release Engineer (CI, Feature Flag, Deploy)
owner: release-engineer
estimate: 1.5d

Objective
---------
- Prepare CI, staging, and deployment for a fast, safe rollout of Website v1. Coordinate migration rehearsals for GSTA-7 but do not block v1 on schema cutover.

Deliverables
------------
1. CI job to run unit, integration and e2e smoke on PRs targeting feat/gsta-118/*.
2. Feature flag control (env/flag) that gates the website v1 UI and API.
3. Staging deploy with canary configuration for initial rollouts.
4. Migration rehearsal plan and a quick checklist for running GSTA-7 migrations safely.

Checklist
---------
- [ ] Add CI matrix entry for feat/gsta-118 that runs the tests and reports status.
- [ ] Add feature flag environment variable FEATURE_GSTA_118=true/false and document how to flip it.
- [ ] Deploy feature branch to staging behind feature flag and smoke test basic flows.
- [ ] Prepare canary tenant(s) and a short monitoring checklist for health checks, error rates, DB locks (if migrations are executed), and logs.
- [ ] Validate atomic file-write permissions and disk space on deployment hosts (staging) to ensure file-backed storage will work.

Notes
-----
- Avoid force-pushing main or amending unrelated commits. Use non-destructive CI practices. If pre-commit hooks fail, fix and create a new commit rather than amending unless explicitly requested.
