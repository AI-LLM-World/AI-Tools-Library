Runbook: Deploy & Canary Rollout  GSTA-118 (website v1)
-------------------------------------------------------

Pre-deploy checks
-----------------
1. CI green for feature branch and PR with unit + integration + e2e smoke.
2. Feature flag set to OFF in production by default.
3. Staging has a snapshot of data/ai_tools.json and enough disk space for file writes.

Canary rollout
--------------
1. Deploy feature branch to a staging environment behind feature flag. Run smoke tests.
2. Identify 1-2 canary tenants (internal accounts) for initial production deploy.
3. Flip feature flag ON for only canary tenants (or route a small percentage of traffic).
4. Monitor for 4-6 hours: application error rate, latency, disk usage, file write errors, logs for submission failures.
5. If stable, expand rollout to 25% traffic / more tenants and repeat monitoring window.
6. Full rollout once stability gates are passed.

Rollback
--------
- If critical errors are observed: flip the feature flag OFF and revert traffic to the previous version. If data corruption occurs, restore ai_tools.json from pre-deploy backup and redeploy.

Post-deploy
-----------
- Ensure admin workflows are exercised and audit logs show expected events. Schedule a post-release retro to capture lessons.
