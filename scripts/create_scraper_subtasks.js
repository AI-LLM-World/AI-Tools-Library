// Creates subtasks for GSTA-39 (Scraper maintenance) under the current Paperclip issue.
// Usage: node scripts/create_scraper_subtasks.js
const url = process.env.PAPERCLIP_API_URL;
const apiKey = process.env.PAPERCLIP_API_KEY;
const runId = process.env.PAPERCLIP_RUN_ID;
const parentId = process.env.PAPERCLIP_TASK_ID;
const companyId = process.env.PAPERCLIP_COMPANY_ID;

if (!url || !apiKey || !runId || !parentId || !companyId) {
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
    title: 'Implement inter-process lock for scraper runner',
    description:
      'Add a robust inter-process lock to packages/scraper to prevent overlapping runs.\n' +
      'Suggested approach: use `proper-lockfile` or `lockfile`, acquire lock on outDir at start of runOnce, fail-fast if lock held.\n' +
      'Add unit tests that simulate concurrent run attempts and ensure only one run proceeds.\nPriority: high',
    assigneeAgentId: agents.staff,
    priority: 'high',
  },
  {
    title: 'Add Docker image + CronJob example for scraper',
    description:
      'Create a Dockerfile-based build and a deployment example (Kubernetes CronJob and systemd timer) that runs the scraper as a single-run task.\n' +
      'Add CI step to build and push the image for releases. Document run commands and env var expectations in packages/scraper/MAINTENANCE.md.\nPriority: medium',
    assigneeAgentId: agents.release,
    priority: 'medium',
  },
  {
    title: 'Add tests and CI coverage for scrapers and runner',
    description:
      'Add unit tests for scraper modules (mock network calls) and expand integration tests to cover validation failures, broken scraper outputs, and locking behavior.\n' +
      'Add GitHub Actions workflow that runs the integration test in a matrix (node versions) and fails the pipeline on regressions.\nPriority: medium',
    assigneeAgentId: agents.qa,
    priority: 'medium',
  },
];

(async () => {
  try {
    for (const t of tasks) {
      const res = await fetch(`${url}/api/companies/${companyId}/issues`, {
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
