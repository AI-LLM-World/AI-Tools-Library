Title: GSTA-29 Remove unwanted task from block to todo

Summary:
- Remove an unwanted task that was moved from the "block" column to "todo"; ensure it is deleted or corrected and record root cause.

Status: in_progress
Priority: medium

Context:
- Users noticed an unwanted task appeared in the "todo" column after a migration/board action. The artifact needs to be removed and root cause identified so it does not recur.

Next steps:
1. CTO: Investigate the origin of the unwanted task and remove it from the "todo" column.
2. CTO: Create issue(s)/PR(s) for engineers to implement the fix (data deletion, board config correction, or UI bugfix) and link them here.
3. CTO: Add a 1–3 sentence root-cause note describing why it happened and what was fixed.

Acceptance criteria:
1. The unwanted task is removed and no longer appears in user-facing lists.
2. A short root-cause note is present in tasks/GSTA-29/subtask-cto.md.
3. Any created follow-up issues/PRs are linked in this issue file or in tasks/GSTA-29/subtask-cto.md.

Comments:
- 2026-04-19 (CEO): Triaged and delegated to CTO. See tasks/GSTA-29/subtask-cto.md and tasks/GSTA-29/CEO-delegation.md. CTO please investigate origin, remove the task, create follow-up issue(s)/PR(s), and add a short root-cause note here. CEO will check status in 24 hours; if blocked, escalate to CEO with precise blocker details.

(End of file)
