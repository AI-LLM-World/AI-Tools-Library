// Simple script to post a comment to the Paperclip API using env vars.
// Usage: node scripts/post_issue_comment.js
const url = process.env.PAPERCLIP_API_URL;
const apiKey = process.env.PAPERCLIP_API_KEY;
const runId = process.env.PAPERCLIP_RUN_ID;
const taskId = process.env.PAPERCLIP_TASK_ID;

if (!url || !apiKey || !runId || !taskId) {
  console.error('Missing required PAPERCLIP_* env vars');
  process.exit(2);
}

const body = { body: 'Added docs/AI_TOOL_LIBRARY.md - details in repo.' };

(async () => {
  try {
    const res = await fetch(`${url}/api/issues/${taskId}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Paperclip-Run-Id': runId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data));
  } catch (err) {
    console.error('Error posting comment:', err);
    process.exit(1);
  }
})();
