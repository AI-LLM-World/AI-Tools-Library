const fs = require('fs');
const path = require('path');

// Usage: node worker_append.js <submissionsPath> <mode: lock|nolock> <id>
const submissionsPath = process.argv[2];
const mode = process.argv[3] || 'nolock';
const id = process.argv[4] || String(process.pid);

function writeJsonAtomic(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function acquireDirLock(lockPath, retries = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.mkdirSync(lockPath);
      return true;
    } catch (err) {
      if (err && err.code === 'EEXIST') {
        // wait a tiny amount then retry
        // busy-wait via sleep
      } else {
        throw err;
      }
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1); // sleep ~1ms
  }
  return false;
}

function releaseDirLock(lockPath) {
  try { fs.rmdirSync(lockPath); } catch (e) { /* ignore */ }
}

try {
  const dir = path.dirname(submissionsPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (mode === 'nolock') {
    // read, append, write without any locking (racy)
    const raw = (() => { try { return fs.readFileSync(submissionsPath, 'utf8'); } catch (_) { return '[]'; } })();
    const arr = (() => { try { return JSON.parse(raw); } catch (_) { return []; } })();
    arr.push({ id, addedAt: Date.now() });
    writeJsonAtomic(submissionsPath, arr);
    process.exit(0);
  }

  // simple dir-lock approach
  const lockPath = submissionsPath + '.lock';
  const ok = acquireDirLock(lockPath, 2000);
  if (!ok) {
    console.error('failed to acquire lock');
    process.exit(2);
  }
  try {
    const raw = (() => { try { return fs.readFileSync(submissionsPath, 'utf8'); } catch (_) { return '[]'; } })();
    const arr = (() => { try { return JSON.parse(raw); } catch (_) { return []; } })();
    arr.push({ id, addedAt: Date.now() });
    writeJsonAtomic(submissionsPath, arr);
  } finally {
    releaseDirLock(lockPath);
  }
  process.exit(0);
} catch (err) {
  console.error('worker failed', err);
  process.exit(1);
}
