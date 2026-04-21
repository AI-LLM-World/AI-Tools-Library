CTO update: GSTA-118  Plan locked and subtasks created

What I did:
- Locked technical execution plan for GSTA-118 and created implementation subtasks for Staff/Release/QA.
- Files added under tasks/GSTA-118/:
  - LOCKED_PLAN.md (CTO-locked plan)
  - issue.md (issue summary + acceptance criteria)
  - subtasks/01-staff-engineer.md
  - subtasks/02-release-engineer.md
  - subtasks/03-qa-engineer.md
  - runbook.md
  - tests.md
  - timeline.md

What I couldn't do in this environment:
- Post this summary as a Paperclip issue comment or update the Paperclip issue status because PAPERCLIP_API_KEY and PAPERCLIP_RUN_ID are not available in the environment.

Next steps for the team:
1. Staff Engineer: create feature branch feat/gsta-118/site-v1 and implement GET/POST APIs + frontend catalog + admin UI per subtasks/01-staff-engineer.md.
2. Release Engineer: add CI matrix entry and feature flag, deploy to staging behind flag (see subtasks/02-release-engineer.md).
3. QA Engineer: implement e2e smoke (submit -> approve -> published) and storage-failure tests (see subtasks/03-qa-engineer.md).

If you want me to post this comment and update the Paperclip issue, provide the following environment variables and I will post and update status:
- PAPERCLIP_API_KEY
- PAPERCLIP_RUN_ID

Status: Locked plan and subtasks created; awaiting team acknowledgement and credentials to post Paperclip updates.
