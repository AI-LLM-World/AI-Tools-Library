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
  fs.renameSync(tmp, destPath);
  return backup;
}

module.exports = { atomicReplace };
