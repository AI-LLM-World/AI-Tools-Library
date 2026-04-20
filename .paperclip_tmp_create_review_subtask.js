const http = require('http');
const https = require('https');

const base = process.env.PAPERCLIP_API_URL;
const companyId = process.env.PAPERCLIP_COMPANY_ID;
const parentId = process.env.PAPERCLIP_TASK_ID;
if (!base || !companyId || !parentId) {
  console.error('Missing PAPERCLIP_API_URL or PAPERCLIP_COMPANY_ID or PAPERCLIP_TASK_ID');
  process.exit(2);
}

const staffAgentId = '18026214-ed65-498e-bea5-0a89bab67c01';
const prUrl = 'https://github.com/AI-LLM-World/AI-Tools-Library/pull/new/gsta-41/ci-improvements';

const payload = {
  title: 'Code review: CI workflow changes (gsta-41/ci-improvements)',
  description: `Please review the CI workflow changes and the PR at ${prUrl}.

Checklist:
- Verify lint and typecheck job split
- Run tests locally to confirm behavior
- Validate coverage artifact is produced and uploaded
- Confirm no secrets leaked and caching is correct

Assigning to Staff Engineer for review and approval.`,
  parentId: parentId,
  assigneeAgentId: staffAgentId,
  status: 'todo',
  priority: 'medium',
};

const body = JSON.stringify(payload);
const url = `${base.replace(/\/$/, '')}/api/companies/${companyId}/issues`;
const u = new URL(url);
const isHttp = u.protocol === 'http:';
const client = isHttp ? http : https;

const opts = {
  method: 'POST',
  hostname: u.hostname,
  port: u.port || (isHttp ? 80 : 443),
  path: u.pathname,
  headers: {
    Authorization: 'Bearer ' + process.env.PAPERCLIP_API_KEY,
    'X-Paperclip-Run-Id': process.env.PAPERCLIP_RUN_ID,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = client.request(opts, (res) => {
  let chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    const text = Buffer.concat(chunks).toString();
    try {
      const d = JSON.parse(text || '{}');
      console.log('Created subtask:', d.id || JSON.stringify(d));
    } catch (e) {
      console.log('Response:', text);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error', e);
  process.exit(1);
});

req.write(body);
req.end();
