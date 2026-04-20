# GSTA-26 — Acceptance Criteria

This document lists acceptance criteria for the Catalog → Quickstart → Results flow. Use these to verify the Figma prototype and to create engineering acceptance tests.

Catalog
- Given I am on the Catalog, When I search or apply filters, Then results update within 2 seconds and matching ToolCards are visible.
- ToolCard includes logo, title, one-line description, badges, rating, Quickstart and Details actions.

Tool Detail & Quickstart
- Given I am on a Tool Detail page, When I click Quickstart and choose sandboxed run, Then the system performs preflight checks, runs the sample test, streams output, and provides a reproducible CLI command.
- Non-functional: Time-to-first-successful-run under 10 minutes for cold sandbox in 80% of QA runs.

Results & Triage
- Given a completed run with failures, When I open the Results page, Then the top 3 failures are highlighted and each includes a reproducible command and minimal triage steps.

CI Integration
- Given I choose "Add to CI", When I select a CI provider, Then the system presents a copyable CI snippet that runs without modification in 80% of sample repos.

Accessibility
- All interactive elements must be keyboard accessible and meet WCAG 2.1 AA contrast requirements.
- Console output must be accessible and use aria-live for streaming.

Performance
- Catalog and Tool Detail primary content should render under 1 second on a 3G simulated network.

Security
- Sandboxed runs must prevent outbound network access by default and provide audit logs for each run.

Prototype-specific acceptance (Figma)
- All frames in ux/prototype_frames.md exist and hotspots complete the flow.
- Quickstart modal demonstrates preflight, running, success, and failure states in the prototype.
- Copy-to-clipboard microinteractions show confirmation in the prototype.
