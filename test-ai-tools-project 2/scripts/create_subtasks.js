// Creates subtasks under the current Paperclip issue using env vars.
// Usage: node scripts/create_subtasks.js
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
    title: 'Migrate AI tools seed to Postgres and update backend',
    description: 'Migrate data/ai_tools.json into Postgres. Add a tools table, migration, and update backend to query the DB with pagination and search. Keep seed loader.\nPriority: high',
    assigneeAgentId: agents.staff,
    priority: 'high',
  },
  {
    title: 'Implement submissions API and admin approval workflow',
    description: 'Add endpoints for programmatic and form-based submissions that land in a review queue. Implement admin approval endpoint that promotes approved submissions into published tools and records an audit log.\nPriority: high',
    assigneeAgentId: agents.staff,
    priority: 'high',
  },
  {
    title: 'Add backend unit tests and e2e for submission flow',
    description: 'Write unit tests for filtering, tags semantics, pagination. Add e2e test for submit->approve->publish path.\nPriority: medium',
    assigneeAgentId: agents.qa,
    priority: 'medium',
  },
  {
    title: 'Add CI smoke tests for tools API and admin endpoints',
    description: 'Create CI checks that run a backend test suite and a smoke test that calls /api/tools and admin flows. Ensure these run in GitHub Actions.\nPriority: medium',
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
