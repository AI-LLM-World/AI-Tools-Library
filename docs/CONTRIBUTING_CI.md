Contributing: CI Improvements (Priority A)
======================================

This short note explains how to preview and create the Paperclip subtasks for the Priority A CI improvements and how to run the preview locally.

Preview subtasks
----------------
- Run: `node scripts/create_ci_subtasks_preview.js` to print JSON payloads for the subtasks. This does not call the Paperclip API.
- To actually create subtasks, use the existing scripts/create_subtasks.js pattern with the required env vars:
  - PAPERCLIP_API_URL, PAPERCLIP_API_KEY, PAPERCLIP_RUN_ID, PAPERCLIP_COMPANY_ID, PAPERCLIP_TASK_ID

Priority A checklist (minimal implementable changes)
--------------------------------------------------
1. Add dependency caching to .github/workflows/ci.yml (done in repo).
2. Upload coverage and junit/test report artifacts from CI (done in repo, job uploads common paths).
3. Run tests per package/workspace: implement next by converting `test` job to a matrix over packages or add per-package steps.

If you want me to create the Paperclip subtasks automatically, provide the required PAPERCLIP_* env vars and I will run the creation script.
