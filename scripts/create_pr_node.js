#!/usr/bin/env node
// Create a PR using GitHub REST API. Token may be passed as argv[2] or via GITHUB_TOKEN env.
const https = require('https');

const owner = 'AI-LLM-World';
const repo = 'AI-Tools-Library';
const branch = 'gsta6/phase1-scaffold';

const token = process.argv[2] || process.env.GITHUB_TOKEN;
if (!token) {
  console.log('NO_GITHUB_TOKEN');
  process.exit(0);
}

const body = {
  title: 'GSTA-6: Phase 1 scaffold & architecture docs',
  head: branch,
  base: 'main',
  body: 'Adds architecture docs and a minimal monorepo scaffold for GSTA-6 Phase 1. Deliverables: docs/ARCHITECTURE.md, docs/PHASE1_TASKS.md, packages/frontend, packages/backend, packages/worker, docker-compose.yml, CI skeleton.'
};

const data = JSON.stringify(body);

const options = {
  hostname: 'api.github.com',
  path: `/repos/${owner}/${repo}/pulls`,
  method: 'POST',
  headers: {
    'User-Agent': 'gstack-cto',
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('PR_CREATED:' + (parsed.html_url || parsed.url || ''));
        process.exit(0);
      } else if (parsed && parsed.message) {
        console.log('PR_CREATE_FAILED:' + parsed.message);
        process.exit(1);
      } else {
        console.log('PR_CREATE_FAILED:status=' + res.statusCode);
        process.exit(1);
      }
    } catch (err) {
      console.log('PR_CREATE_FAILED:invalid_response');
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.log('PR_CREATE_FAILED:' + e.message);
  process.exit(1);
});

req.write(data);
req.end();
