const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Usage: node harness_concurrent_submissions.js <parallelism> <mode: lock|nolock>
const parallel = parseInt(process.argv[2] || '32', 10);
const mode = process.argv[3] || 'nolock';

const submissionsPath = path.resolve(__dirname, '..', '..', 'data', 'submissions.json');
if (fs.existsSync(submissionsPath)) fs.unlinkSync(submissionsPath);

let finished = 0;
let failures = 0;

for (let i = 0; i < parallel; i++) {
  const id = `test-${Date.now()}-${i}`;
  const child = spawn(process.execPath, [path.resolve(__dirname, 'worker_append.js'), submissionsPath, mode, id], { stdio: 'inherit' });
  child.on('exit', (code) => {
    finished++;
    if (code !== 0) failures++;
    if (finished === parallel) {
      const raw = (() => { try { return fs.readFileSync(submissionsPath, 'utf8'); } catch (_) { return '[]'; } })();
      const arr = (() => { try { return JSON.parse(raw); } catch (_) { return []; } })();
      console.log('\nHarness finished. mode=', mode, 'parallel=', parallel, 'successCount=', arr.length, 'failures=', failures);
      const duplicates = arr.length !== parallel;
      console.log('duplicates or lost writes:', duplicates ? 'YES' : 'NO');
      process.exit(0);
    }
  });
}
