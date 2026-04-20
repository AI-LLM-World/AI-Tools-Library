const http = require('http');

const base = process.env.PAPERCLIP_API_URL || 'http://127.0.0.1:3100';
const company = process.env.PAPERCLIP_COMPANY_ID;
const apiKey = process.env.PAPERCLIP_API_KEY;
const runId = process.env.PAPERCLIP_RUN_ID;

if (!apiKey) {
  console.error('PAPERCLIP_API_KEY is required');
  process.exit(2);
}

function postComment(issueId, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ body });
    const url = new URL(`/api/issues/${issueId}/comments`, base);
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

(async function () {
  const issueId = process.argv[2];
  if (!issueId) {
    console.error('Usage: node scripts/pc_post_comment.js <issueId>');
    process.exit(2);
  }

  const body = `CTO update: I created three subtasks for GSTA-40 and assigned them:

- Implementation notes & screenshots — Staff Engineer (GSTA-77)
- Deploy checklist & access control review — Release Engineer (GSTA-78)
- QA test matrix and verification — QA Engineer (GSTA-79)

Please pick up your assigned subtask and update it as you make progress.`;

  const res = await postComment(issueId, body);
  console.log('Comment posted:', res.id);
})();
