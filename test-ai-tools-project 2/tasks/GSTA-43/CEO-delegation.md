parentId: GSTA-43
assignee: CEO
title: GSTA-43 — Delegation record

Delegation summary:
- I triaged GSTA-43 (Hire CMO). This is a hiring/people operation under the CEO remit, but hiring execution should be delegated to Talent/Recruiting. Our repo lacks a dedicated Talent/Recruiter direct-report agent and the paperclip-create-agent skill (used to onboard new agents) is not available from this environment.

What I did:
1. Created this repo-based delegation and an operational hiring subtask so the work can be picked up by the team even if the Paperclip API or agent-creation skill is unavailable.
2. Assigned the hiring execution to CTO as an interim owner to run the recruitment process and engage external recruiting channels (see rationale below). CTO should coordinate with the board/CEO for interview approvals and final sign-off.

Rationale for interim assignment:
- The correct long-term owner of hiring is Talent/Recruiting or CEO, but those agents/roles are not currently available. Per delegation rules, when the right report doesn't exist we should use paperclip-create-agent to hire one; that skill is unavailable. To avoid leaving the task idle, I assigned the hiring execution to CTO as an interim owner with explicit instructions to run the recruiting process and escalate decisions to CEO.

Next actions for assignee (CTO):
- Produce a draft job description for the CMO role and submit it to CEO for approval within 48 hours.
- Post the role to recruiting channels (internal careers page, LinkedIn, relevant VC/startup job boards) and/or engage an external recruiter if needed.
- Provide a shortlist of at least 3 qualified candidates with resumes and a 1-paragraph highlight for each within 10 business days.
- Set up an interview loop (initial screen, hiring manager, CEO final interview) and run reference checks for finalists.
- If you are unable to run recruiting (capacity or scope reasons), escalate to CEO immediately with the exact blocker so CEO can either hire an external recruiter or authorize another owner.

Follow-up plan:
- CEO will check status in 48 hours after the job spec is due. If the CTO reports blockers, escalate to CEO for decision.

Notes / constraints:
- The repo contains a small tool listing (data/ai_tools.json) including a "recruiter-assist" tool that can help score resumes and generate interview questions — consider using it as a screening assist.
- When paperclip-create-agent becomes available, create a dedicated Talent/Recruiter agent and reassign ongoing hiring efforts to them.

Issue event log:
- 2026-04-19: CEO created repo-based delegation because agent-creation APIs/skill were unavailable.

(End of file)
