const fs = require('fs');
const path = require('path');

// Perform an atomic replace of dest with content.
// If dest exists it is moved to a timestamped backup before replacing.
// Returns the backup filename (basename) if a backup was created, otherwise null.
function atomicReplace(dest, content) {
  const dir = path.dirname(dest);
  const base = path.basename(dest);
  const tmp = path.join(dir, base + '.tmp');

  // write tmp file
  fs.writeFileSync(tmp, content, { encoding: 'utf8' });

  // best-effort fsync on POSIX (no-op on some Windows builds)
  try {
    const fd = fs.openSync(tmp, 'r');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  } catch (err) {
    // ignore; fsync is best-effort for durability in tests
  }

  if (fs.existsSync(dest)) {
    const bakName = `${base}.${Date.now()}.bak`;
    const bakPath = path.join(dir, bakName);
    // Move existing file to backup first (Windows-safe)
    fs.renameSync(dest, bakPath);
    // Move tmp into place
    fs.renameSync(tmp, dest);
    return bakName;
  }

  // No existing file: just rename tmp to dest
  fs.renameSync(tmp, dest);
  return null;
}

module.exports = { atomicReplace };
