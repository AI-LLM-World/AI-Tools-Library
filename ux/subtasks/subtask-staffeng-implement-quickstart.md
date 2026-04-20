# Subtask: Staff Engineer — Implement Quickstart Runner & Results UI (GSTA-26)

Assignee: Staff Engineer
Priority: high

Description
- Implement the Quickstart runner UI and Results page per docs/GSTA-26-interaction-specs.md and docs/GSTA-26-ux-audit-and-spec.md. This includes preflight checks, a streaming logs console, reproducible CLI commands, and the results/triage flows. Ensure sandbox default policy (no network) and audit logging for runs.

Deliverables
- Frontend components: Quickstart modal/runner, console controls, Results page with failures/triage carousel, copy-to-clipboard microinteractions.
- Backend contract: preflight endpoints, streaming runner (SSE/WebSocket), results API endpoints as outlined in docs/GSTA-26-interaction-specs.md.
- E2E tests verifying the happy path and key failure paths (preflight failure, streaming logs, copy command, Create Issue prefill).

Acceptance Criteria
1. Preflight checks present pass/fail states and show remediation on failure. "Retry preflight" re-runs checks inline.
2. Streaming logs are delivered to the frontend via SSE/WebSocket and appended to a role="log" aria-live region.
3. Console controls: Pause/Resume, filter (All/Errors/Warnings), Collapse/Expand stack traces, autoscroll with "Jump to bottom" indicator.
4. Reproducible command shows a copy button. Copy triggers an ephemeral visible toast and an aria-live announcement "Reproducible command copied to clipboard".
5. Results page highlights top 3 failures, each includes a reproducible command and an expandable code context snippet.
6. Create Issue button opens the configured issue-tracker with a prefilled template containing run metadata (tool id, run id, top failures, reproducible command).
7. Sandboxed runs default to no outbound network; enabling network requires org-admin policy change.
8. All interactive elements keyboard-accessible and meet WCAG 2.1 AA contrast.
9. Primary content renders under 1s on simulated 3G (non-functional requirement).

Notes
- Coordinate with UX Designer for any UI assets (once Figma access is provided by CTO via ux/subtasks/subtask-cto-create-figma.md).
- If implementation complexity requires breaking this subtask into smaller tickets, create and link them and cc the UX Designer.

(End of file)
