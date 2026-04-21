const fs = require('fs');
const path = require('path');

function atomicReplace(destPath, content) {
  const dir = path.dirname(destPath);
  const tmp = path.join(dir, `ai_tools.json.tmp.${process.pid}.${Date.now()}.${Math.floor(Math.random() * 100000)}`);

  // Write temp file
  fs.writeFileSync(tmp, content, 'utf8');

  // Ensure data is flushed to disk where possible (best-effort)
  try {
    const fd = fs.openSync(tmp, 'r');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  } catch (err) {
    // best-effort, continue
    console.warn('fsync tmp failed (best-effort):', err && err.message);
  }

  let backup = null;
  if (fs.existsSync(destPath)) {
    // make backup name more unique to avoid collisions
    backup = `${destPath}.${Date.now()}.${process.pid}.${Math.floor(Math.random() * 100000)}.bak`;
    try {
      fs.renameSync(destPath, backup);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        // destination was already removed/moved by another process; proceed without backup
        backup = null;
      } else if (err && err.code === 'EXDEV') {
        // cross-device rename: fallback to copy+unlink
        try {
          fs.copyFileSync(destPath, backup);
          fs.unlinkSync(destPath);
        } catch (err2) {
          console.error('Failed to create cross-device backup of existing file:', err2);
          throw err2;
        }
      } else {
        console.error('Failed to create backup of existing file:', err && err.message);
        throw err;
      }
    }
  }

  // rename tmp into place
  try {
    fs.renameSync(tmp, destPath);
  } catch (err) {
    // cleanup tmp best-effort
    try { fs.unlinkSync(tmp); } catch (e) { /* ignore */ }

    // attempt to restore backup if present
    if (backup && fs.existsSync(backup)) {
      try {
        fs.renameSync(backup, destPath);
      } catch (err2) {
        console.error('Failed to restore backup after failed rename:', err2 && err2.message);
      }
    }
    throw err;
  }

  // Best-effort: fsync destination file and parent directory so rename is durable
  try {
    try {
      const dfd = fs.openSync(destPath, 'r');
      try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
    } catch (err) {
      console.warn('fsync(dest) failed (best-effort):', err && err.message);
    }

    try {
      const dirfd = fs.openSync(dir, 'r');
      try { fs.fsyncSync(dirfd); } finally { fs.closeSync(dirfd); }
    } catch (err) {
      console.warn('fsync(dir) failed (best-effort):', err && err.message);
    }
  } catch (err) {
    console.warn('Post-rename fsyncs failed (best-effort):', err && err.message);
  }

  return backup;
}

module.exports = { atomicReplace };
