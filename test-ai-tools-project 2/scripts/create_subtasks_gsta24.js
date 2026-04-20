// Creates subtasks under the current Paperclip issue for GSTA-24 using env vars.
// Usage: node scripts/create_subtasks_gsta24.js
const url = process.env.PAPERCLIP_API_URL;
const apiKey = process.env.PAPERCLIP_API_KEY;
const runId = process.env.PAPERCLIP_RUN_ID;
const parentId = process.env.PAPERCLIP_TASK_ID;

if (!url || !apiKey || !runId || !parentId) {
  console.error('Missing required PAPERCLIP_* env vars');
  process.exit(2);
}

const agents = {
  staff: '18026214-ed65-498e-bea5-0a89bab67c01',
  qa: 'e7bc455f-035e-46c2-a88c-a0abdcfea37b',
  release: 'c55fab5b-dc42-490e-834f-c3fe62114bc5',
};

const tasks = [
  {
    title: 'Implement storage helpers and validation for submissions',
    description: 'Add atomic write helpers, idempotency mapping, and JSON schema/Zod validation. Add unit tests for helpers.\nPriority: high',
    assigneeAgentId: agents.staff,
    priority: 'high',
  },
  {
    title: 'Add POST /api/tools/submit with Basic Auth and idempotency',
    description: 'Implement endpoint with X-Idempotency-Key support and proper HTTP responses. Add integration tests.\nPriority: high',
    assigneeAgentId: agents.staff,
    priority: 'high',
  },
  {
    title: 'Implement admin endpoints and audit events',
    description: 'GET list/detail, POST approve/reject, promote to published tools. Emit structured audit events.\nPriority: high',
    assigneeAgentId: agents.staff,
    priority: 'high',
  },
  {
    title: 'Add backend unit/integration tests and coverage checks',
    description: 'Expand tests to cover validation, idempotency, storage helpers, and admin flows. Ensure coverage >= 90% for submission paths.\nPriority: high',
    assigneeAgentId: agents.qa,
    priority: 'high',
  },
  {
    title: 'Add e2e Playwright tests for submit->approve->publish',
    description: 'Implement Playwright tests that exercise frontend submission and admin approval path.\nPriority: medium',
    assigneeAgentId: agents.qa,
    priority: 'medium',
  },
  {
    title: 'Add CI smoke and perf tests for submissions flow',
    description: 'Create CI workflow to run unit/integration/e2e and a perf job for concurrent submissions.\nPriority: medium',
    assigneeAgentId: agents.release,
    priority: 'medium',
  },
  {
    title: 'Create runbook for corrupted submissions.json and secret rotation',
    description: 'Operational runbook for handling corrupted data files and rotating/revoking client credentials.\nPriority: medium',
    assigneeAgentId: agents.release,
    priority: 'medium',
  },
];

(async () => {
  try {
    for (const t of tasks) {
      const res = await fetch(`${url}/api/companies/${process.env.PAPERCLIP_COMPANY_ID}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-Paperclip-Run-Id': runId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: t.title,
          description: t.description,
          parentId: parentId,
          assigneeAgentId: t.assigneeAgentId,
          status: 'todo',
          priority: t.priority,
        }),
      });

      const data = await res.json().catch(() => ({}));
      console.log('Created:', data.id, data.identifier || data.title || '<no-id>');
    }
  } catch (err) {
    console.error('Error creating subtasks:', err);
    process.exit(1);
  }
})();
