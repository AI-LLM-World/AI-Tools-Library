const fs = require('fs');
const path = require('path');

async function run(opts) {
  // Try to use repo data if available (convenience for local development)
  const repoData = path.resolve(__dirname, '../../data/ai_tools.json');
  if (fs.existsSync(repoData)) {
    try {
      const raw = fs.readFileSync(repoData, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // return a small subset for quick runs
        return parsed.slice(0, 10);
      }
    } catch (err) {
      // fall through to synthetic data
      console.warn('Failed to read repo data/ai_tools.json', err && err.message);
    }
  }

  // synthetic fallback
  return [
    { id: 'scraper-example-1', name: 'Scraper Example One', category: 'Example', short_description: 'Generated sample', website: null, tags: [], example_use: 'demo' },
    { id: 'scraper-example-2', name: 'Scraper Example Two', category: 'Example', short_description: 'Generated sample', website: null, tags: [], example_use: 'demo' }
  ];
}

module.exports = { run };
