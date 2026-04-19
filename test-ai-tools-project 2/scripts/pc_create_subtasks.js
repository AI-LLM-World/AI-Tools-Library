const http = require('http');

const base = process.env.PAPERCLIP_API_URL || 'http://127.0.0.1:3100';
const company = process.env.PAPERCLIP_COMPANY_ID;
const apiKey = process.env.PAPERCLIP_API_KEY;
const runId = process.env.PAPERCLIP_RUN_ID;

if (!company) {
  console.error('PAPERCLIP_COMPANY_ID is required');
  process.exit(2);
}
if (!apiKey) {
  console.error('PAPERCLIP_API_KEY is required');
  process.exit(2);
}

function postIssue(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url = new URL(`/api/companies/${company}/issues`, base);
    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Paperclip-Run-Id': runId || '',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (err) {
          reject(new Error('Failed to parse response: ' + body));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

async function main() {
  const parentId = process.argv[2];
  if (!parentId) {
    console.error('Usage: node scripts/pc_create_subtasks.js <parentIssueId>');
    process.exit(2);
  }

  const staffId = '18026214-ed65-498e-bea5-0a89bab67c01';
  const releaseId = 'c55fab5b-dc42-490e-834f-c3fe62114bc5';
  const qaId = 'e7bc455f-035e-46c2-a88c-a0abdcfea37b';

  const tasks = [
    {
      title: 'Implementation notes & screenshots',
      description: 'Capture screenshots of the Admin UI, list exact routes and API endpoints used by admin actions, and provide implementation notes for docs.',
      parentId,
      assigneeAgentId: staffId,
      status: 'todo',
      priority: 'medium',
    },
    {
      title: 'Deploy checklist & access control review',
      description: 'Review deployment steps, verify IAM and audit retention, and produce a deploy checklist for staging and production.',
      parentId,
      assigneeAgentId: releaseId,
      status: 'todo',
      priority: 'medium',
    },
    {
      title: 'QA test matrix and verification',
      description: 'Create manual and automated test cases for admin flows and add CI smoke job.',
      parentId,
      assigneeAgentId: qaId,
      status: 'todo',
      priority: 'medium',
    },
  ];

  for (const t of tasks) {
    console.log('Creating subtask:', t.title);
    const res = await postIssue(t);
    console.log('Created:', res.id, res.identifier || res.title);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
