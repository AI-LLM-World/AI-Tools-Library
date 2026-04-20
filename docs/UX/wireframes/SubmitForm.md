Title: Submit Form — Wireframe & Validation Spec
Status: in_progress
Author: UX Designer
Date: 2026-04-20

Context
- Public submit form allows users to propose new tools. Backend endpoint: POST /api/submissions (packages/backend/src/index.ts).

ASCII Wireframe

---------------------------------------------
| Submit a Tool                              |
---------------------------------------------
| [Name] (required)                          |
| [ID / slug] (auto-suggest from Name)      |
| [Category] (typeahead; required)          |
| [Short description] (required)            |
| [Website] (optional; URL validation)      |
| [Tags] (comma or Enter to add)            |
| [Example use] (optional)                  |
| [Submit button]                            |
---------------------------------------------

Validation rules (client-side)
- id: required, slug format (lowercase, letters, numbers, dashes). Auto-suggest from name but editable.
- name: required, non-empty.
- category: required.
- short_description: required, < 300 chars recommended.
- website: optional but must be a valid URL if provided.
- tags: optional; normalized to lowercase and trimmed.

Submission flow
1. Client validates fields and disables the submit button during in-flight request.
2. POST to /api/submissions; on 201 show confirmation panel: "Thanks — submission id: <id>, status: pending" and instructions for expected review times.
3. On error, show field-level error messages from server if available; otherwise show a global error message and suggest trying again.

Acceptance criteria (Submit Form)
1. Form has required validation and prevents submission with invalid data.
2. Successful submission shows confirmation with returned id and status.
3. Form prevents double submissions by disabling the submit button while request is in flight.

Anti-abuse notes
- Phase 1 uses the minimal POST endpoint. Monitor submissions and consider adding rate limiting, CAPTCHA, or email verification if spam appears.
