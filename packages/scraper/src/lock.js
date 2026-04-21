const fs = require('fs');
const path = require('path');

// Lightweight inter-process lock with optional proper-lockfile support.
// Behavior:
// - Try to use `proper-lockfile` if installed.
// - Otherwise create a lock file at <outDir>/.ai_tools.lock with JSON { pid, startedAt }.
// - Fail-fast by default (no retries). Caller should handle retries if desired.

function _lockFilePath(outDir) {
  return path.join(outDir, '.ai_tools.lock');
}

function _useProperLockfile(outDir) {
  try {
    // eslint-disable-next-line global-require
    const lockfile = require('proper-lockfile');
    const release = lockfile.lockSync(outDir, { retries: 0 });
    return { release: () => release() };
  } catch (err) {
    if (err && err.code === 'MODULE_NOT_FOUND') return null;
    // Propagate unexpected errors from proper-lockfile
    throw err;
  }
}

function acquireLock(outDir, opts) {
  opts = opts || {};
  // test hook: force using the simple fallback lock implementation even when
  // proper-lockfile is available. Useful for deterministic tests.
  const forceFallback = !!opts.forceFallback;
  const retries = typeof opts.retries === 'number' ? opts.retries : 0;
  const retryDelay = typeof opts.retryDelay === 'number' ? opts.retryDelay : 1000;
  const staleMs = typeof opts.staleMs === 'number' ? opts.staleMs : 24 * 60 * 60 * 1000; // 24h

  // Prefer proper-lockfile when available unless forced to fallback.
  const proper = !forceFallback && _useProperLockfile(outDir);
  if (proper) return proper;

  const lockPath = _lockFilePath(outDir);

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const payload = JSON.stringify({ pid: process.pid, startedAt: Date.now() });
      fs.writeFileSync(lockPath, payload, { flag: 'wx' });

      // Register a best-effort release on exit
      const release = () => {
        try {
          if (fs.existsSync(lockPath)) {
            try { fs.unlinkSync(lockPath); } catch (e) { /* ignore */ }
          }
        } catch (e) {
          // best-effort
          // eslint-disable-next-line no-console
          console.warn('Failed to release lock (best-effort):', e && e.message);
        }
      };

      const exitHandler = () => release();
      process.on('exit', exitHandler);
      process.on('SIGINT', exitHandler);
      process.on('SIGTERM', exitHandler);

      return { release };
    } catch (err) {
      if (err && err.code !== 'EEXIST') throw err;

      // lock exists, check if stale or owned by dead process
      let removedStale = false;
      try {
        const raw = fs.readFileSync(lockPath, 'utf8');
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (e) { /* ignore */ }
        const pid = parsed && parsed.pid;
        const startedAt = parsed && parsed.startedAt ? parsed.startedAt : 0;
        const age = Date.now() - startedAt;

        // If lock file is stale, remove and retry immediately (without consuming an attempt)
        if (age > staleMs) {
          try { fs.unlinkSync(lockPath); removedStale = true; } catch (e) { /* ignore */ }
        } else if (typeof pid === 'number') {
          try {
            process.kill(pid, 0);
            // no error => process exists, treat lock as held
          } catch (e) {
            if (e && e.code === 'ESRCH') {
              // process does not exist -> remove stale lock and retry
              try { fs.unlinkSync(lockPath); removedStale = true; } catch (e2) { /* ignore */ }
            }
            // EPERM or others -> treat as held
          }
        }
      } catch (e) {
        // Couldn't read lock file: attempt to remove and retry
        try { fs.unlinkSync(lockPath); removedStale = true; } catch (e2) { /* ignore */ }
      }

      if (removedStale) {
        // try again without incrementing attempt
        continue;
      }

      // if we are here lock is held by a live process
      if (attempt < retries) {
        // sleep and retry
        const waitUntil = Date.now() + retryDelay;
        while (Date.now() < waitUntil) { /* busy-wait is acceptable for short retry */ }
        attempt += 1;
        continue;
      }

      const holder = (() => {
        try {
          const raw = fs.readFileSync(lockPath, 'utf8');
          const parsed = JSON.parse(raw);
          return parsed && parsed.pid ? `pid=${parsed.pid}` : 'unknown';
        } catch (e) { return 'unknown'; }
      })();

      throw new Error(`Failed to acquire lock; currently held by ${holder}`);
    }
  }
}

module.exports = { acquireLock };
