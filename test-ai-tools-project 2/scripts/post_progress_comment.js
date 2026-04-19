// Post a detailed progress comment to the current Paperclip issue
const url = process.env.PAPERCLIP_API_URL;
const apiKey = process.env.PAPERCLIP_API_KEY;
const runId = process.env.PAPERCLIP_RUN_ID;
const taskId = process.env.PAPERCLIP_TASK_ID;

if (!url || !apiKey || !runId || !taskId) {
  console.error('Missing required PAPERCLIP_* env vars');
  process.exit(2);
}

const body = {
  body:
    'Implementation update:\n- Added support for file-backed submissions: data/submissions.json.\n- Implemented POST /api/submissions (create pending submission), GET /api/admin/submissions (list), and POST /api/admin/submissions/:id/approve (approve and promote into ai_tools.json).\n- Added scripts to simulate submission and approve: scripts/simulate_submission_and_approve.js.\n\nNotes: This is a minimal Phase 2 implementation without authentication. Before shipping, add auth, audit logs, and migrate to a DB-backed store.\n\nSubtasks already created: GSTA-33, GSTA-34, GSTA-35, GSTA-36'
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
