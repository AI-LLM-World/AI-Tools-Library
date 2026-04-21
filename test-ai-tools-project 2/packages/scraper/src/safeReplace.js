const fs = require('fs');
const path = require('path');

function atomicReplace(destPath, content) {
  const dir = path.dirname(destPath);
  const tmp = path.join(dir, `ai_tools.json.tmp.${process.pid}.${Date.now()}`);
  // Write temp file
  fs.writeFileSync(tmp, content, 'utf8');

  // Ensure data is flushed to disk where possible
  try {
    const fd = fs.openSync(tmp, 'r');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  } catch (err) {
    // best-effort, continue
    console.warn('fsync failed (best-effort):', err && err.message);
  }

  let backup = null;
  if (fs.existsSync(destPath)) {
    // move existing file to a timestamped backup name
    backup = `${destPath}.${Date.now()}.bak`;
    try {
      fs.renameSync(destPath, backup);
    } catch (err) {
      // fallback to copy+unlink if rename fails (Windows cross-device edge)
      try {
        fs.copyFileSync(destPath, backup);
        fs.unlinkSync(destPath);
      } catch (err2) {
        console.error('Failed to create backup of existing file:', err2);
        throw err2;
      }
    }
  }

  // rename tmp into place
  try {
    fs.renameSync(tmp, destPath);
  } catch (err) {
    // If moving the tmp file into place fails, attempt to restore the
    // previous backup (if created) to avoid leaving destination missing.
    console.error('Failed to rename tmp into place:', err && err.message);
    if (backup && fs.existsSync(backup)) {
      try {
        // try to move backup back to dest
        fs.renameSync(backup, destPath);
      } catch (err2) {
        console.error('Failed to restore backup after failed rename:', err2 && err2.message);
      }
    }
    // rethrow to signal failure to caller
    throw err;
  }

  // Best-effort: ensure directory entry is flushed so the rename is durable
  // on POSIX systems. Also try to fsync the destination file.
  try {
    // fsync dest file
    try {
      const dfd = fs.openSync(destPath, 'r');
      try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
    } catch (err) {
      // continue even if fsync on file fails
      console.warn('fsync(dest) failed (best-effort):', err && err.message);
    }

    // fsync directory
    try {
      const dirfd = fs.openSync(dir, 'r');
      try { fs.fsyncSync(dirfd); } finally { fs.closeSync(dirfd); }
    } catch (err) {
      // On some platforms (Windows, some network filesystems) this will fail.
      // We intentionally don't make this fatal.
      console.warn('fsync(dir) failed (best-effort):', err && err.message);
    }
  } catch (err) {
    // swallow any unexpected errors to preserve best-effort behavior
    console.warn('Post-rename fsyncs failed (best-effort):', err && err.message);
  }

  return backup;
}

module.exports = { atomicReplace };
