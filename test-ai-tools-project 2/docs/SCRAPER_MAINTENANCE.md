Scraper Maintenance Guide

Purpose
- Provide on-call and maintenance guidance for the background scraper that produces/updates data/ai_tools.json (the seed tool catalog).
- Target audience: Staff Engineer, Release Engineer, QA Engineer, and on-call engineers.

Overview
- The backend (packages/backend/src/index.ts) reads data/ai_tools.json into memory at startup and watches the file for changes. A background scraper/process may periodically rewrite this file. Because the frontend and API depend on this file, the scraper must update it atomically and be operated safely.

Key principles
- Never write the canonical file in-place: always write to a temp file and atomically rename/replace.
- Keep updates small and validated: validate schema before replacing the live file.
- Emit structured logs and metrics for each run: start, success, failure, duration, records_written.
- Keep a short history of previous versions and a simple rollback path.

File format and validation
- Expected file: data/ai_tools.json
- Root must be a JSON array of objects. Each object must have at minimum: id (string), name (string). See data/README.md for full shape.
- Always run a strict validation pass (JSON Schema/Zod/etc.) after generation and before replacing the live file.

Safe update procedure (recommended implementation)
1. Scraper generates the new dataset in-memory.
2. Validate the dataset against the canonical schema. If validation fails, abort and emit an error.
3. Serialize to a temp file in the same directory, e.g. data/ai_tools.json.tmp.<pid>.
4. fsync the temp file (if supported) to ensure data is on disk.
5. Rename temp -> ai_tools.json using fs.rename or platform-appropriate atomic replace. On Windows prefer fs.rename replacement semantics or use libraries that implement atomic replace.
6. Emit a success metric and a short diff (number of records added/removed). Keep the previous file at data/ai_tools.json.<timestamp>.bak for 24–72 hours.

Concurrency and races
- The backend uses fs.watchFile and keeps an in-memory cache. However, fs.watch semantics vary by platform. The scraper should:
  - Ensure single-writer semantics. If multiple scraper instances exist, elect a leader (cron/scheduler) or use a distributed lock.
  - Minimize write frequency (e.g. hourly or on-change) to reduce race risk.

Rollback and emergency steps (runbook)
1. If the backend logs parsing errors or empty results after a scraper run, check the latest ai_tools.json file for validity.
2. Command: open data/ and inspect ai_tools.json and the most recent backup data/ai_tools.json.<timestamp>.bak
3. If the live file is malformed or missing entries, restore the latest known-good backup by copying or renaming it into place using the safe-replace procedure.
4. Restart backend process only if it's in a bad state and the watcher didn't pick up the restored file. The backend should pick up file changes automatically; use restart only when necessary.
5. Post-mortem: capture logs, cause, and remediation steps. Create a follow-up task if the root cause is recurring.

Monitoring and alerts
- Logs: scraper-run-start, scraper-run-success, scraper-run-failure with record counts and duration.
- Metrics: scraper_runs_total, scraper_run_duration_seconds, scraper_run_failures_total, scraper_records_written.
- Alert rules (examples):
  - Pager when scraper_run_failures_total increases by >1 in 1 hour.
  - Alert if ai_tools.json file size is 0 or if parsed records == 0.

Testing the scraper
- Unit tests for the generation logic and schema validation.
- Integration tests that run the scraper against a temporary directory and assert the safe-replace semantics (temp file creation, rename, backup created).
- CI should run a smoke end-to-end: run scraper, then start backend in test mode and call /api/tools to ensure results are returned.

CI and release
- Keep scraper code in a feature branch and run CI that includes the integration tests above.
- During release, ensure environment variables/config that control run frequency and destinations are correct and secrets (if any) are not in repo.

Ownership and contacts
- Owner: Staff Engineer (primary) — responsible for code, tests, and deploys.
- Release Engineer — responsible for release gating and CI jobs.
- QA Engineer — responsible for test coverage and e2e verification.

Common failure modes and mitigations
- Partial write / corrupted JSON: guard by temp-file + validation before replace.
- Disk full: detect via write errors; alert on-call and fail gracefully.
- Schema changes: bump validator and increase test coverage; communicate changes to backend owners.

Maintenance checklist (quick ops)
1. Before making changes, run scraper locally against a temp dir and validate output.
2. Deploy with feature flag or to staging first.
3. Monitor metrics for the first 24 hours.
4. Keep backups for 72 hours and sweep older backups daily.

Appendix: Example safe-replace snippet (Node.js)
```js
// generate `out` (string) then:
const tmp = path.join(dataDir, `ai_tools.json.tmp.${process.pid}`);
fs.writeFileSync(tmp, out, 'utf8');
// optional: fs.fsyncSync(fs.openSync(tmp, 'r'));
fs.renameSync(tmp, path.join(dataDir, 'ai_tools.json'));
// write a timestamped backup of the previous file before replacement when possible
```

Related docs
- data/README.md (format spec)
- tasks/GSTA-12/* (submission flow & storage migration plan)
