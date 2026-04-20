const url = process.env.PAPERCLIP_API_URL;
const apiKey = process.env.PAPERCLIP_API_KEY;
const runId = process.env.PAPERCLIP_RUN_ID;
const taskId = process.env.PAPERCLIP_TASK_ID;

if (!url || !apiKey || !runId || !taskId) {
  console.error('Missing required PAPERCLIP_* env vars');
  process.exit(2);
}

const body = {
  body: 'DB migration plan and scripts added: docs/AI_TOOL_LIBRARY_DB_MIGRATION.md, packages/backend/src/db.ts (skeleton), and packages/backend/scripts/migrate_to_db.js (backfill). Staff Engineer: please review and run migrate_to_db.js against a staging Postgres instance when ready.'
};

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
