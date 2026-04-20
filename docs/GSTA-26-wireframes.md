# GSTA-26 — Wireframes

Purpose
- Low-fidelity wireframes for the Catalog → Quickstart → Results happy path. These frames should match the Figma frames and the HTML prototype behavior.

1) Catalog — Desktop
- Header: Logo (left), SearchBar (center), Org/Avatar (right)
- Filters below search: chips for language, tool type, CI-ready, sandboxable
- ToolGrid: 3-column ToolCards with logo, title, one-line description, badges, rating, Quickstart button, Details link
- Hover behavior: show Quickstart and Save actions overlay

2) Tool Detail — Desktop
- Hero: left column with logo, name, tags; right column Quickstart panel with Sandbox toggle, primary Quickstart button, secondary "Run locally" CLI box
- Tabs: Overview, Quickstart, CI Snippets, Docs; Quickstart tab includes sample commands and presets

3) Quickstart Modal / Runner
- Modal header: Title, close button
- Preflight section: check list with pass/fail states and remediation text on fail
- Console area: streaming logs with progress and autoscroll rules
- Reproducible command box: copy button and small helper text
- Footer: Cancel, Run

4) Results Page
- Header summary: Status pill, duration, artifacts link, Re-run and Create Issue buttons
- Failures list: accordion items sorted by severity showing file:line, message, code context, reproducible command
- Triage carousel: suggested next steps with quick CTAs

Wireframe annotations
- Keyboard: modals trap focus; all controls reachable via Tab; focus states visible
- Accessibility: console area must use aria-live and role="log" to stream updates to screen readers
- Performance: primary content must render <1s on 3G simulated network

References
- UX: ux/02_wireframes.md, ux/prototype_frames.md
