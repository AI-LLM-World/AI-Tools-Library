Scraper System Architecture and Execution Plan

Overview
- Goal: Provide a small, robust, testable background scraper that produces data/ai_tools.json using safe-update semantics. The backend watches this file and serves it from memory. The scraper must be safe to run regularly and be simple to operate in CI and production.

Components
- Scraper runner (packages/scraper): small, dependency-free Node.js process that loads "scraper" plugins, merges results, validates the output, and writes atomically to data/ai_tools.json using a safe-replace flow.
- Backend (packages/backend): already reads and watches data/ai_tools.json. The scraper populates/updates that file.
- Scheduling / Orchestration: run scraper as a CronJob (K8s), scheduled container, or via GitHub Actions for periodic runs. Ensure single-writer semantics via scheduling or leader election.
- Observability: scraper should emit structured logs and metrics (scraper_run_start, scraper_run_success, scraper_run_failure, scraper_records_written, scraper_run_duration_seconds). The initial implementation logs to stdout; a metrics exporter can be added later.

Data flow (sequence)
1. Scheduler triggers scraper container (or operator runs it manually).
2. Scraper loads configured plugins (files in packages/scraper/scrapers) and runs them.
3. Scrapers produce a canonical array of tool objects.
4. Runner validates the array (root array, each item has id and name at minimum).
5. Runner serializes the output and writes to data/ai_tools.json in the target directory using an atomic safe-replace:
   - write to temp file in same dir
   - fsync (best-effort)
   - move existing ai_tools.json -> ai_tools.json.<timestamp>.bak
   - rename temp -> ai_tools.json
6. Backend's fs.watchFile notices the change and reloads in-memory cache.

Failure Modes and Mitigations
- Malformed output: validator blocks replace; the live file is not touched and an error is emitted.
- Partial write: temp file + atomic rename prevents partial writes overwriting live file.
- Disk full: write will fail; detect and alert. Keep last-good backup available.
- Concurrent writers: avoid by scheduling a single writer, or implement distributed locking (future enhancement).
- Windows semantics: rename semantics differ; current implementation moves live file to a timestamped backup before renaming tmp -> live which works across platforms.

Testing
- Unit tests: validator and safe-replace behavior.
- Integration test: packages/scraper/test/integration.js (runs the scraper to a temp dir, starts a tiny HTTP server that mimics backend behavior, queries /api/tools, and asserts results). CI should run this test.

CI / Release
- Add a CI job that:
  1. Installs node (>=18)
  2. Runs `npm --prefix packages/scraper test` to exercise integration test
  3. Optionally runs backend integration: start backend pointing at the tmp dir and call real /api/tools (requires installing backend dependencies)

Operational runbook (quick)
1. Run locally: `node src/index.js --out-dir ./data --once` in packages/scraper
2. Check logs for scraper-run-success and record counts.
3. If the backend reports parsing errors, inspect data/ and restore a backup `data/ai_tools.json.<timestamp>.bak` using the safe-replace procedure.

Next steps / Improvements
- Add Prometheus metrics exposition (simple HTTP /metrics endpoint) and a push/pull mechanism for production.
- Add plugin configuration (sources, rate limits, auth) and secrets handling.
- Add leader election or distributed lock for multi-instance deployments.
- Add a Docker Compose service for the scraper for local testing if desired.
