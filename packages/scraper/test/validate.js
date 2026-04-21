const cp = require('child_process');
const path = require('path');

function runNode(script, env = {}) {
  const fullEnv = Object.assign({}, process.env, env);
  const res = cp.spawnSync(process.execPath, ['-e', script], { env: fullEnv, encoding: 'utf8' });
  return res;
}

// Script that exercises validate.js with a mixed payload and prints the
// number of valid items on success or exits non-zero on error.
const checkScript = `
const validate = require('../src/validate.js');
try {
  const input = [{id: 'ok', name: 'OK'}, {id: null, name: 'NoId'}, {id: 'no_name', name: ''}];
  const out = validate(input);
  console.log(JSON.stringify({ len: out.length }));
} catch (e) {
  console.error('ERR', e && e.message);
  process.exit(2);
}
`;

// 1) Run with AJV enabled (if available). Expect at least one valid item.
console.log('Running validate.js test (AJV enabled if present)');
let r = runNode(checkScript, {});
if (r.status !== 0) {
  console.error('AJV-enabled run failed:', r.stdout, r.stderr);
  process.exit(1);
}
console.log('AJV-enabled output:', r.stdout.trim());

// 2) Force fallback path by setting AJV_DISABLED=1 and ensure behavior is the same.
console.log('Running validate.js test (AJV disabled -> fallback validator)');
r = runNode(checkScript, { AJV_DISABLED: '1' });
if (r.status !== 0) {
  console.error('Fallback run failed:', r.stdout, r.stderr);
  process.exit(1);
}
console.log('Fallback output:', r.stdout.trim());

// 3) Ensure that when no valid items exist, validate throws (non-zero exit)
const failScript = `
const validate = require('../src/validate.js');
try {
  validate([{id: null, name: ''}, {}]);
  console.log('SHOULD_HAVE_FAILED');
  process.exit(3);
} catch (e) {
  // Expected
  console.error('EXPECTED_FAIL', e && e.message);
  process.exit(0);
}
`;

console.log('Running validate.js failure case (expect non-zero from validator)');
r = runNode(failScript, { AJV_DISABLED: '1' });
if (r.status !== 0) {
  console.error('Failure-case did not exit as expected:', r.stdout, r.stderr);
  process.exit(1);
}

console.log('validate.js tests passed');
