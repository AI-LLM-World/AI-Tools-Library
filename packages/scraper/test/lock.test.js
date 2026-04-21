const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const lock = require('../src/lock.js');

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scraper-lock-test-'));
  console.log('Using tmpdir', tmp);

  // First acquisition should succeed
  const h1 = lock.acquireLock(tmp, { retries: 0, forceFallback: true });
  assert(h1 && typeof h1.release === 'function', 'First lock acquisition failed');

  // Second immediate acquisition should fail
  let secondFailed = false;
  try {
    lock.acquireLock(tmp, { retries: 0, forceFallback: true });
  } catch (err) {
    secondFailed = true;
    console.log('Second acquire failed as expected:', err.message);
  }
  assert(secondFailed, 'Second lock acquisition should have failed when lock held');

  // Release first
  h1.release();

  // Now acquisition should succeed again
  const h2 = lock.acquireLock(tmp, { retries: 0, forceFallback: true });
  assert(h2 && typeof h2.release === 'function', 'Lock acquisition after release failed');
  h2.release();

  // Simulate stale lock and ensure acquire succeeds after stale removal
  const staleLockPath = path.join(tmp, '.ai_tools.lock');
  const stale = JSON.stringify({ pid: 999999, startedAt: Date.now() - (48 * 60 * 60 * 1000) });
  fs.writeFileSync(staleLockPath, stale, 'utf8');

  // Wait a tick so file mtime is established
  await sleep(10);

  const h3 = lock.acquireLock(tmp, { retries: 0, staleMs: 24 * 60 * 60 * 1000, forceFallback: true });
  assert(h3 && typeof h3.release === 'function', 'Lock acquisition after stale removal failed');
  h3.release();

  console.log('Lock tests passed');
})();
