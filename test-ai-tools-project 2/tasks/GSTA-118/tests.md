Test Matrix  GSTA-118 (Website v1)
-----------------------------------

Unit tests
----------
- Validation: payload schema, slug/id rules, HTTPS website field.
- Storage helpers: atomic write, temp-file replacement, optimistic concurrency.
- Auth helper: Basic Auth accept/reject.

Integration tests
-----------------
- POST /api/tools/submit with valid/invalid payloads and Basic Auth cases.
- GET /api/tools with query+filters returning expected result sets.
- Admin approve/reject flows updating submissions.json and ai_tools.json.

E2E smoke
---------
- Headless flow: submit via API or form -> Admin approves via UI -> verify published appears on public listing.

Failure / Edge cases
--------------------
- Disk full / write error: ensure partial writes are not left in place; test temp-file cleanup.
- Concurrent submissions: run a concurrency test (50 concurrent submissions) and assert no JSON corruption and all submissions persisted.
- XSS vectors: attempt malicious payloads and assert sanitization on render.

Performance smoke
-----------------
- 100 concurrent GET /api/tools reads with typical ai_tools.json size (sample dataset) to verify reasonable response times.

CI Integration
--------------
- Run unit + integration tests on PRs; run e2e smoke on merge to staging. Performance smoke can be gated to nightly if needed.
