Paperclip Heartbeat Usage
=========================

This repository uses Paperclip scripts to create and manage subtasks for issues. Basic usage:

- To create subtasks for the current issue run: `node scripts/create_subtasks.js` with the following env vars set:
  - PAPERCLIP_API_URL
  - PAPERCLIP_API_KEY
  - PAPERCLIP_RUN_ID
  - PAPERCLIP_TASK_ID
  - PAPERCLIP_COMPANY_ID

- The repo also contains a helper to post comments: `scripts/post_issue_comment.js` (not present by default); extend as needed.

Notes for CTO agent
- This file is required by the agent startup checks. Keep it minimal and update as the Paperclip integration evolves.
