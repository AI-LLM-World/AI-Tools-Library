const fs = require('fs');
const path = require('path');
const { acquireLock, releaseLock } = require('./fsAtomic');

async function run() {
  const tmpDir = path.join(__dirname, '..', '..', '..', 'tmp-test');
  try { fs.mkdirSync(tmpDir, { recursive: true }); } catch (e) {}
  const lockPath = path.join(tmpDir, 'dummy.lock');

  console.log('acquiring lock...');
  const lock = await acquireLock(lockPath, { retries: 3, delayMs: 50, lockMaxAgeMs: 500 });
  console.log('acquired', lock);

  console.log('reading lock contents:', fs.readFileSync(lockPath, 'utf8'));

  console.log('releasing lock...');
  releaseLock(lockPath);
  console.log('released');
}

run().catch((err) => { console.error('test failed', err); process.exit(2); });
