const http = require('http');

const base = process.env.PAPERCLIP_API_URL || 'http://127.0.0.1:3100';
const company = process.env.PAPERCLIP_COMPANY_ID;
const apiKey = process.env.PAPERCLIP_API_KEY;
const runId = process.env.PAPERCLIP_RUN_ID;
const identifier = process.argv[2];

if (!company) {
  console.error('PAPERCLIP_COMPANY_ID is required');
  process.exit(2);
}
if (!apiKey) {
  console.error('PAPERCLIP_API_KEY is required');
  process.exit(2);
}
if (!identifier) {
  console.error('Usage: node scripts/pc_find_issue.js GSTA-40');
  process.exit(2);
}

const options = {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'X-Paperclip-Run-Id': runId || '',
    'Content-Type': 'application/json',
  },
};

const url = new URL(`/api/companies/${company}/issues?status=todo,in_progress,blocked`, base);

const req = http.request(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const found = parsed.find((i) => i.identifier === identifier || i.title?.includes(identifier));
      if (!found) {
        console.error('Issue not found');
        process.exit(3);
      }
      console.log(JSON.stringify(found, null, 2));
    } catch (err) {
      console.error('Failed to parse response:', err.message);
      console.error(data);
      process.exit(2);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
  process.exit(2);
});

req.end();
