const fs = require('fs');
const path = require('path');

// Best-effort sleep helper used during lock acquisition retries.
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Acquire a simple filesystem lock by creating a "<dest>.lock" file.
// This helper is intentionally conservative: it will try to avoid
// stomping an active lock, and will only remove a lock when it appears
// stale (based on mtime and an attempt to check the pid in the lock file).
async function acquireLock(lockPath, { retries = 30, delayMs = 100, lockMaxAgeMs = parseInt(process.env.LOCK_MAX_AGE_MS || '300000', 10) } = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      try {
        fs.writeSync(fd, `${process.pid}\n${Date.now()}`);
      } finally {
        fs.closeSync(fd);
      }
      return lockPath;
    } catch (err) {
      // already locked
      if (err && err.code === 'EEXIST') {
        // Check if the lock is stale. Prefer to consult the pid in the lock
        // file and only remove a lock when the owner process is no longer
        // alive. Fall back to mtime-based stale removal if pid is missing or
        // unreadable.
        try {
          const txt = fs.readFileSync(lockPath, 'utf8').split('\n');
          const pid = parseInt(txt[0], 10);
          if (!Number.isNaN(pid) && pid > 0) {
            try {
              process.kill(pid, 0);
              // owner alive -> wait and retry
            } catch (e) {
              // If we get EPERM the process exists but we don't have
              // permission to signal it — treat that as "alive" and do
              // not remove the lock (conservative). Any other error
              // (ESRCH) indicates the PID no longer exists and the lock
              // *may* be removed. To avoid a TOCTOU where another process
              // replaced the lock file between our read and unlink, re-read
              // and only unlink if the owner is still the same.
              if (e && e.code === 'EPERM') {
                // owner alive but not signalable -> wait+retry
              } else {
                try {
                  const cur = fs.readFileSync(lockPath, 'utf8');
                  const curOwner = parseInt((cur.split('\n')[0] || '').trim(), 10);
                  if (curOwner === pid) {
                    try { fs.unlinkSync(lockPath); } catch (e2) { /* best-effort */ }
                  } else {
                    // Someone else replaced the lock in the meantime; do not remove.
                  }
                } catch (e2) {
                  // Could not re-read; fall back to an mtime check as a last resort.
                  try {
                    const stat = fs.statSync(lockPath);
                    if (Date.now() - stat.mtimeMs > lockMaxAgeMs) {
                      try { fs.unlinkSync(lockPath); } catch (e3) { /* best-effort */ }
                    }
                  } catch (e3) {
                    // ignore and will retry
                  }
                }
                continue;
              }
            }
          } else {
            // no pid present, fall back to mtime age. Re-stat to avoid
            // unlinking a lock that was just replaced.
            try {
              const stat = fs.statSync(lockPath);
              if (Date.now() - stat.mtimeMs > lockMaxAgeMs) {
                try {
                  const stat2 = fs.statSync(lockPath);
                  if (stat2.mtimeMs === stat.mtimeMs) {
                    try { fs.unlinkSync(lockPath); } catch (e2) { /* best-effort */ }
                    continue;
                  }
                  // changed in the meantime -> wait+retry
                } catch (e2) {
                  // can't re-stat; best-effort unlink
                  try { fs.unlinkSync(lockPath); } catch (e3) { /* best-effort */ }
                  continue;
                }
              }
            } catch (e) {
              // ignore and fall through to wait+retry
            }
          }
        } catch (e) {
          // Could not read lock file; fall back to mtime check
          try {
            const stat = fs.statSync(lockPath);
            if (Date.now() - stat.mtimeMs > lockMaxAgeMs) {
              try { fs.unlinkSync(lockPath); } catch (e2) { /* best-effort */ }
              continue;
            }
          } catch (e2) {
            // ignore and will retry
          }
        }

        // wait a bit and retry
        // eslint-disable-next-line no-await-in-loop
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`failed to acquire lock for ${lockPath}`);
}

function releaseLock(lockPath) {
  try {
    if (!fs.existsSync(lockPath)) return;

    // Read the lock file once and use this as the canonical expected owner.
    let initialRaw;
    try {
      initialRaw = fs.readFileSync(lockPath, 'utf8');
    } catch (e) {
      // Can't read the lock file; best-effort unlink and return.
      try { fs.unlinkSync(lockPath); } catch (e2) { /* best-effort */ }
      return;
    }

    const ownerPid = parseInt((initialRaw.split('\n')[0] || '').trim(), 10);

    // If there is an owner recorded and it's not us, prefer a liveness check.
    if (!Number.isNaN(ownerPid) && ownerPid !== process.pid) {
      try {
        process.kill(ownerPid, 0);
        // owner alive -> do not remove
        console.warn(`Refusing to remove lock ${lockPath}: owned by pid ${ownerPid}`);
        return;
      } catch (e) {
        // EPERM means the process exists but we cannot signal it; treat as alive.
        if (e && e.code === 'EPERM') {
          console.warn(`Refusing to remove lock ${lockPath}: owner pid ${ownerPid} not signalable (EPERM)`);
          return;
        }

        // Owner appears dead. Before unlinking, re-check the file hasn't been
        // replaced by another process (TOCTOU protection).
        try {
          const cur = fs.readFileSync(lockPath, 'utf8');
          const curOwner = parseInt((cur.split('\n')[0] || '').trim(), 10);
          if (curOwner === ownerPid) {
            try { fs.unlinkSync(lockPath); } catch (e2) { /* best-effort */ }
          } else {
            // Someone else replaced the lock in the meantime; do not remove.
          }
          return;
        } catch (e2) {
          // Can't re-read; best-effort unlink.
          try { fs.unlinkSync(lockPath); } catch (e3) { /* best-effort */ }
          return;
        }
      }
    }

    // If owner is us or no owner pid present, attempt to unlink but ensure
    // the file hasn't been replaced by another owner in the meantime.
    try {
      const cur = fs.readFileSync(lockPath, 'utf8');
      // If the content is unchanged (or still owned by us), it's safe to
      // remove. If it changed, abstain to avoid unlinking a freshly created lock.
      if (cur === initialRaw || parseInt((cur.split('\n')[0] || '').trim(), 10) === process.pid) {
        try { fs.unlinkSync(lockPath); } catch (e) { /* best-effort */ }
      }
    } catch (e) {
      // Can't re-read; best-effort unlink.
      try { fs.unlinkSync(lockPath); } catch (e2) { /* best-effort */ }
    }
  } catch (err) {
    console.warn('failed to release lock', lockPath, err && err.message);
  }
}

// Perform an atomic replace of destPath using a temp file in the same
// directory. Returns the backup path when a backup of the previous file
// was created, otherwise null.
async function atomicReplace(destPath, content, { retries, delayMs, lockMaxAgeMs } = {}) {
  const dir = path.dirname(destPath);
  const tmp = path.join(dir, `tmp.${path.basename(destPath)}.${process.pid}.${Date.now()}`);
  let backup = null;
  const lockPath = `${destPath}.lock`;

  // Acquire a short-lived lock so multiple concurrent processes do not
  // try to perform the same replace at once.
  await acquireLock(lockPath, { retries, delayMs, lockMaxAgeMs });

  try {
    // Write temp file into same directory so rename will be on the same fs
    fs.writeFileSync(tmp, content, 'utf8');

    // Ensure data is flushed to disk for the temp file (best-effort)
    try {
      const fd = fs.openSync(tmp, 'r');
      try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    } catch (err) {
      console.warn('fsync(tmp) failed (best-effort):', err && err.message);
    }

    // If the destination exists, create a copy as a backup (best-effort).
    if (fs.existsSync(destPath)) {
      backup = `${destPath}.${Date.now()}.bak`;
      try {
        fs.copyFileSync(destPath, backup);
      } catch (err) {
        console.warn('backup copy failed (best-effort):', err && err.message);
        backup = null;
      }
    }

    // Atomically move the temp file into place.
    fs.renameSync(tmp, destPath);

    // Attempt to fsync the containing directory to make the rename durable
    // across crashes (best-effort).
    try {
      const dirFd = fs.openSync(dir, 'r');
      try { fs.fsyncSync(dirFd); } finally { fs.closeSync(dirFd); }
    } catch (err) {
      console.warn('fsync(dir) failed (best-effort):', err && err.message);
    }

    return backup;
  } catch (err) {
    // Cleanup temp file on failure
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch (cleanupErr) {
      console.warn('Failed to cleanup tmp file (best-effort):', cleanupErr && cleanupErr.message);
    }
    throw err;
  } finally {
    // release lock (best-effort) using the helper to avoid removing someone
    // else's lock.
    try { releaseLock(lockPath); } catch (e) { console.warn('failed to release lock', lockPath, e && e.message); }
  }
}

module.exports = { acquireLock, releaseLock, atomicReplace };
