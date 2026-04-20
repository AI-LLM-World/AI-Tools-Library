const http = require('http');
const https = require('https');
const rawUrl = process.env.PAPERCLIP_API_URL + '/api/issues/' + process.env.PAPERCLIP_TASK_ID + '/comments';
const bodyText = `Update: I implemented the locked CI/CD & Testing Infrastructure Guide and created subtasks.

What I added:
- docs/CI-CD-TESTING-GUIDE.md
- tasks/GSTA-41/issue.md
- tasks/GSTA-41/subtasks.md

Paperclip subtasks created:
- GSTA-48 - ea1fe47d-d9d0-41f2-b2f8-9c11cce8d5cd
- GSTA-49 - 3955acb6-30f7-446d-ad8b-a97a60c337bc
- GSTA-50 - f4e731f6-5e26-4aaf-88ed-6420c5ab5432
- GSTA-51 - c69acbf4-aeed-44d1-a56f-7a409d7ee0bd

Branch with CI updates:
- gsta-41/ci-improvements (pushed). Create PR: https://github.com/AI-LLM-World/AI-Tools-Library/pull/new/gsta-41/ci-improvements

Next steps:
1) Release Engineer: implement PR checks improvements (GSTA-48)
2) Staff Engineer: implement integration harness (GSTA-49)
3) QA Engineer: add E2E & visual (GSTA-50)
4) Release Engineer: release workflow & publishing (GSTA-51)

I left the issue in_progress until the PR is opened and assigned. I can open the PR via the Paperclip API or post again when PR is created.`;

const body = JSON.stringify({ body: bodyText });
const u = new URL(rawUrl);
const isHttp = u.protocol === 'http:';
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

const client = isHttp ? http : https;
const req = client.request(opts, (res) => {
  let chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    try {
      const d = JSON.parse(Buffer.concat(chunks).toString());
      console.log('Posted comment id:', d.id || JSON.stringify(d));
    } catch (e) {
      console.log('Posted comment, response:', Buffer.concat(chunks).toString());
    }
  });
});

req.on('error', (e) => {
  console.error('Request error', e);
  process.exit(1);
});

req.write(body);
req.end();
