# GSTA-26 — Interaction Spec (Detailed)

Purpose
- Provide engineers and QA a detailed interaction and implementation-ready spec for the Catalog → Quickstart → Results flow. Use this alongside docs/GSTA-26-ux-audit-and-spec.md and docs/GSTA-26-acceptance-criteria.md.

Primary surfaces
- Catalog (search, filters, ToolCard)
- Tool Detail (Quickstart panel)
- Quickstart Modal / Runner (preflight, streaming console, reproducible CLI)
- Results page (failures, triage actions)

Implementation notes and component behaviour

Catalog — Search & Filters
- Search type-ahead
  - Debounce: 200ms client-side. Show up to 5 suggestions.
  - Keyboard: Up/Down to move selection, Enter to open Tool Detail, ESC to clear suggestions.
  - Accessibility: input uses role="combobox" with aria-controls referencing the listbox. Suggestion list uses role="listbox" and each item role="option".
  - Performance: results update within 2s (AC). Use server-side paging and index for suggestion queries.
- Filters
  - Represent filters as toggleable chips with aria-pressed. Persist filter state to URL query params (lang, type, ci, sandbox) so users can share links.

ToolCard
- Structure: logo, title, one-line description, badges (language, CI-ready, sandboxable), rating, Quickstart button, Details link.
- Hover: overlay shows Quickstart and Save actions. Quickstart is keyboard focusable.

Tool Detail & Quickstart panel
- Quickstart panel contains:
  - Sandbox toggle (default ON, no network)
  - Primary Quickstart button (opens Quickstart modal)
  - Read-only "Run locally" CLI box with copy button
- Sandbox default: ON to reduce security concerns. Admins can configure org policy via Admin Dashboard.

Quickstart Modal / Runner
- Modal container
  - role="dialog" & aria-modal="true". Trap focus while open and return focus to invoking element on close. Close on ESC and via close button with aria-label.
- Preflight checks
  - UI: vertical list of checks each with status (pass, warn, fail). Failed checks show a compact remediation row with a "Show remediation" button revealing exact steps/commands and a copy button.
  - Retry preflight: reruns checks without closing modal. Show spinner and incremental results.
- Console streaming area
  - Container: role="log" and aria-live="polite". New lines appended and announced politely to screen readers.
  - Autoscroll rules: if user is scrolled to bottom, auto-scroll on new logs. If user scrolled away, pause auto-scroll and show a "Jump to bottom" button.
  - Controls: Pause/Resume stream, filter dropdown (All / Errors / Warnings), Collapse/Expand stack traces.
  - Visual: highlight ERROR/WARN lines with a distinct background and bold text. Provide icons for severity.
  - Implementation: stream via SSE or WebSocket (recommended). Events: log, progress, error, summary.
- Reproducible command box
  - Read-only text with copy button. On copy: show ephemeral toast "Command copied" (2s) and an aria-live="polite" announcement "Reproducible command copied to clipboard".
  - Helper text: short description "Copy to reproduce this run locally. Includes minimal env variables."
- Footer actions
  - Cancel: aborts run (send cancel signal to runner). Run: starts the sample run and disables non-essential controls until completion.

Results Page
- Header summary: status pill (Success/Partial/Fail), duration, artifacts link, Re-run, Create Issue.
- Failures list:
  - Sorted by severity and frequency. Each item shows severity, file:line, truncated message and a copy-to-clipboard command.
  - Expand to show code context (±3 lines), full message, and reproduction command. Copy button for command.
  - Provide inline anchor links so engineers can deep-link to a specific failure.
- Triage carousel:
  - Cards: Retry with flags, Run locally, Create Issue. Each card includes a short description and primary CTA.

Accessibility requirements
- All interactive elements keyboard accessible. Focus order logical and visible focus outlines.
- Streaming logs: role="log" and aria-live="polite." Provide a separate summarized error list that is static so screen reader users can review errors without streaming noise.
- Color contrast must meet WCAG 2.1 AA.

Security & privacy
- Sandbox default no-network. All sandbox runs logged to org audit logs.
- Never display environment secrets in the UI. If env variables are sensitive, redact or show masked values and explicit warning.

Backend contract (recommended)
- Preflight endpoints
  - GET /api/tools/:id/preflight — returns [{ id, label, status: pass|fail|warn, remediation: markdown }]
  - POST /api/tools/:id/preflight/retry — triggers recheck and returns updated list
- Runner streaming
  - SSE/WebSocket endpoint /api/tools/:id/run that emits events:
    - event: preflight, data: {checks}
    - event: log, data: {level, text, ts}
    - event: progress, data: {percent}
    - event: error, data: {message, code}
    - event: summary, data: {status, duration, artifacts, failures: [{file, line, message, reproCommand, severity}]}
- Results
  - GET /api/runs/:runId — returns summary and failures array with repro commands and artifacts links

QA Checklist (component-level acceptance tests)
1. Catalog search type-ahead works with keyboard and updates results within 2s.
2. Filters toggleable, persist to URL, and applying filters updates results.
3. Quickstart modal preflight shows fail remediation; Retry preflight updates state.
4. Streaming logs: autoscroll behavior correct, Pause/Resume works, filter shows only errors/warnings.
5. Reproducible command copy shows toast and aria-live announcement.
6. Results page highlights top 3 failures; reproductible commands copyable and Create Issue opens a prefilled template.
7. All interactive controls accessible by keyboard and meet WCAG contrast.

References
- docs/GSTA-26-ux-audit-and-spec.md
- docs/GSTA-26-wireframes.md
- docs/GSTA-26-acceptance-criteria.md

(End of file)
