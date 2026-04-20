# GSTA-26 — Usability Risks & Mitigations

Risk 1: Users cannot find a relevant tool quickly
- Symptoms: Low discoverability, long time-to-task, users abandon flow
- Mitigation: Implement type-ahead search, prominent filter chips, and prioritized featured items. Include clear badges (language, CI-ready, sandboxable) on ToolCards.

Risk 2: Preflight failures are opaque or un-actionable
- Symptoms: Users can't fix dependency or permission issues; high drop-off after preflight
- Mitigation: Show specific remediation steps per failed preflight check (exact install commands, permission prompts). Provide a "Retry preflight" and a "Run locally" CLI with environment variables.

Risk 3: Console output is noisy and hard to parse
- Symptoms: Users miss important errors among verbose logs
- Mitigation: Highlight ERROR/WARN lines, provide collapsible stack traces and a summary header showing top 3 failure reasons. Offer a filter to show only errors/warnings.

Risk 4: Users can't reproduce failures locally
- Symptoms: Time-to-fix increases, triage is delayed
- Mitigation: Provide a line-by-line reproducible CLI command, include environment variables and minimal sample repo, and provide a prefilled issue template for quick bug filing.

Risk 5: Accessibility barriers in streaming console
- Symptoms: Screen reader users miss live log updates or get overwhelmed
- Mitigation: Use aria-live regions with polite updates, provide a summarized error list separate from the streaming console, and allow users to pause/seek the stream.

Risk 6: Security concerns with sandbox runs
- Symptoms: Admins restrict use, sandbox may leak data
- Mitigation: Default sandbox to no network access, provide clear org-level policies in Admin dashboard, and log all outbound attempts in audit logs.

Risk 7: CI snippet doesn't run out-of-the-box
- Symptoms: Snippet requires environment-specific edits, causing setup friction
- Mitigation: Provide provider-specific templates with minimal variables and a "Test snippet" flow in sample repos during QA.

Monitoring & Metrics
- Track: time-to-first-successful-run, preflight pass rate, copy-to-clipboard rate for reproducible CLI, percent of runs that end in failure vs success, time-to-reproduce locally.
