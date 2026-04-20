const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const scraper = require('../src/index.js');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'scraper-test-'));
  console.log('Using tmpdir', tmpdir);

  // First run - generate file
  await scraper.run(tmpdir);
  const dest = path.join(tmpdir, 'ai_tools.json');
  assert(fs.existsSync(dest), 'ai_tools.json should exist after run');

  const raw = fs.readFileSync(dest, 'utf8');
  const items = JSON.parse(raw);
  assert(Array.isArray(items) && items.length > 0, 'ai_tools.json should contain items');

  // start a tiny HTTP server that mimics the backend's /api/tools behavior
  const http = require('http');
  const server = http.createServer((req, res) => {
    if (req.url && req.url.startsWith('/api/tools')) {
      try {
        const raw2 = fs.readFileSync(dest, 'utf8');
        const parsed = JSON.parse(raw2);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ total: parsed.length, page: 1, limit: parsed.length, results: parsed }));
      } catch (err) {
        res.writeHead(500);
        res.end('failed');
      }
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log('Test server listening on', port);

  const resp = await httpGet(`http://127.0.0.1:${port}/api/tools`);
  assert(resp.statusCode === 200, 'Expected 200 from test server');
  const body = JSON.parse(resp.body);
  assert(Array.isArray(body.results) && body.total === items.length, 'backend returned expected results');

  // Second run - should create a backup of the previous file
  await scraper.run(tmpdir);
  const files = fs.readdirSync(tmpdir);
  const bak = files.find(f => /^ai_tools.json\.\d+\.bak$/.test(f));
  assert(bak, 'backup file should exist after second run');

  server.close();
  console.log('Integration test passed');
}

main().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
