const fs = require('fs');
const path = require('path');

// Perform an atomic replace of destPath using a temp file in the same
// directory. Guarantees that readers observing destPath see either the old
// content or the complete new content (no partial/truncated file). This is
// a best-effort, cross-platform helper: when running on non-POSIX filesystems
// (NFS, network mounts) or object stores, callers should not rely on POSIX
// rename atomicity and prefer a transactional manifest (DB) or per-record
// objects.
function atomicReplace(destPath, content) {
  const dir = path.dirname(destPath);
  const tmp = path.join(dir, `ai_tools.json.tmp.${process.pid}.${Date.now()}`);
  let backup = null;

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
    // Copying keeps dest present during the operation and avoids a window
    // where the file is missing for readers.
    if (fs.existsSync(destPath)) {
      backup = `${destPath}.${Date.now()}.bak`;
      try {
        fs.copyFileSync(destPath, backup);
      } catch (err) {
        // Do not fail the whole operation for backup copy failures; log and
        // continue. Backups are best-effort.
        console.warn('backup copy failed (best-effort):', err && err.message);
        backup = null;
      }
    }

    // Atomically move the temp file into place. On POSIX this replaces
    // destPath with the new file atomically. On some filesystems this may
    // not be fully atomic; callers should account for their environment.
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
      // best-effort cleanup
      console.warn('Failed to cleanup tmp file (best-effort):', cleanupErr && cleanupErr.message);
    }
    throw err;
  }
}

module.exports = { atomicReplace };
