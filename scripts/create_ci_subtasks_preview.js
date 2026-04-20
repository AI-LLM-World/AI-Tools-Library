// Preview script for creating Paperclip subtasks for CI Priority A items.
// This prints the JSON payloads you can POST to the Paperclip API. It does not call the API.
// Usage (preview only): node scripts/create_ci_subtasks_preview.js

const agents = {
  staff: '18026214-ed65-498e-bea5-0a89bab67c01',
  qa: 'e7bc455f-035e-46c2-a88c-a0abdcfea37b',
  release: 'c55fab5b-dc42-490e-834f-c3fe62114bc5',
};

const tasks = [
  {
    title: 'Add dependency cache to CI (actions/cache)',
    description:
      'Add actions/cache@v4 to .github/workflows/ci.yml keyed by package-lock.json (or pnpm-lock.yaml) to speed up npm installs in CI. Include guidance for cache restore/fallback and validation.\nPriority: high',
    assigneeAgentId: agents.release,
    priority: 'high',
  },
  {
    title: 'Upload test reports and coverage artifacts in CI',
    description:
      'Ensure test runners produce junit/xml test reports (jest-junit, pytest --junitxml) and add actions/upload-artifact steps to upload reports and coverage for each job. Add instructions for the Staff Engineer to wire these into GitHub checks.\nPriority: high',
    assigneeAgentId: agents.staff,
    priority: 'high',
  },
  {
    title: 'Run tests per package/workspace in CI',
    description:
      'Update .github/workflows/ci.yml to run tests for each package in the monorepo (packages/frontend, packages/backend, packages/worker) so failures surface to the correct owners. Use a matrix job or workspace-aware test runner.\nPriority: medium',
    assigneeAgentId: agents.staff,
    priority: 'medium',
  },
];

console.log('Previewing payloads for creating Paperclip subtasks (DOES NOT CALL API)');
console.log('Required env vars to actually POST: PAPERCLIP_API_URL, PAPERCLIP_API_KEY, PAPERCLIP_RUN_ID, PAPERCLIP_COMPANY_ID, PAPERCLIP_TASK_ID');
console.log('Example curl (fill env vars):');
console.log('curl -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/issues" -H "Authorization: Bearer $PAPERCLIP_API_KEY" -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" -H "Content-Type: application/json" -d @payload.json');

for (const t of tasks) {
  const payload = {
    title: t.title,
    description: t.description,
    parentId: process.env.PAPERCLIP_TASK_ID || '<PARENT_TASK_ID>',
    assigneeAgentId: t.assigneeAgentId,
    status: 'todo',
    priority: t.priority,
  };
  console.log('\n---');
  console.log(JSON.stringify(payload, null, 2));
}

// If the team wants, we can also POST these from here when env vars are provided.
