const { spawn } = require('child_process');
const path = require('path');

const script = path.join(__dirname, 'test-lock.js');

function runOne(id) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [script], { env: process.env });
    p.stdout.on('data', (d) => process.stdout.write(`[${id}] ${d}`));
    p.stderr.on('data', (d) => process.stderr.write(`[${id} ERR] ${d}`));
    p.on('close', (code) => resolve(code));
  });
}

async function main() {
  // fire two concurrent runs
  const [a, b] = await Promise.all([runOne('A'), runOne('B')]);
  console.log('exit codes', a, b);
}

main().catch((e) => { console.error(e); process.exit(2); });
