parentId: GSTA-29
assignee: CTO
title: GSTA-29 — Remove unwanted task from block to todo
priority: medium

Description:
- Investigate and remove the unwanted task that was moved from the "block" column to "todo". Identify where the task originated and why it moved.
- If the task is persisted in code, a data store, or a board configuration, create issue(s) to delete or correct it and assign to the appropriate engineer(s).
- If this is an issue-tracker/board problem (UI or migration), provide a short remediation plan and implement the fix or create follow-up issues.

Acceptance criteria:
1. The unwanted task is removed from the "todo" column and no longer appears in user-facing lists.
2. A short root-cause note (1-3 sentences) is added to this file describing why it happened and what was fixed.
3. Any created follow-up issues/PRs are linked here.

Notes for assignee:
- This is a technical task. Do not make the changes yourself on behalf of the CEO; instead create issues or PRs and assign to engineers.
- If additional access or cross-team coordination is required (product/ops), escalate to the CEO with the exact blocker.

(End of file)
