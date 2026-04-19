// Simulate creating a submission and approving it using the same on-disk format
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const submissionsPath = path.join(repoRoot, 'data', 'submissions.json');
const toolsPath = path.join(repoRoot, 'data', 'ai_tools.json');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    return [];
  }
}

function writeJsonAtomic(p, data) {
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, p);
}

(function main() {
  const id = 'test-sub-' + Date.now();
  const submission = {
    id,
    name: 'Test Submission ' + Date.now(),
    category: 'Test',
    short_description: 'Automated test submission',
    website: 'https://example.com',
    tags: ['test'],
    example_use: 'Used in tests',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const submissions = readJson(submissionsPath);
  submissions.push(submission);
  writeJsonAtomic(submissionsPath, submissions);
  console.log('Wrote submission', submission.id);

  // Approve it: read back, find it, promote to tools
  const subs2 = readJson(submissionsPath);
  const idx = subs2.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('submission not found after write');

  const submissionToApprove = subs2[idx];

  const tools = readJson(toolsPath);
  const exists = tools.find(t => t.id === id);
  if (!exists) {
    const tool = {
      id: submissionToApprove.id,
      name: submissionToApprove.name,
      category: submissionToApprove.category,
      short_description: submissionToApprove.short_description,
      website: submissionToApprove.website,
      tags: submissionToApprove.tags,
      example_use: submissionToApprove.example_use,
    };
    tools.push(tool);
    writeJsonAtomic(toolsPath, tools);
    console.log('Promoted to tools:', tool.id);
  } else {
    console.log('Tool already exists, skipping promotion');
  }

  subs2[idx] = { ...submissionToApprove, status: 'approved', approvedAt: new Date().toISOString() };
  writeJsonAtomic(submissionsPath, subs2);
  console.log('Marked submission approved');
})();
