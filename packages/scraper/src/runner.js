const fs = require('fs');
const path = require('path');
const pLimit = require('p-limit');

const safeReplace = require('./safeReplace');
const validate = require('./validate');

// Run all scrapers with a concurrency limit and robust per-scraper error handling.
// Returns an object { dest, records, backup } on success.
async function runOnce(outDir, options = {}) {
  const scrapersDir = path.join(__dirname, 'scrapers');
  const scrapers = [];

  if (fs.existsSync(scrapersDir)) {
    const files = fs.readdirSync(scrapersDir);
    for (const f of files) {
      if (f.endsWith('.js')) {
        try {
          const mod = require(path.join(scrapersDir, f));
          if (typeof mod.run === 'function') scrapers.push({ name: f, run: mod.run });
        } catch (err) {
          // best-effort: log loader failures but continue
          // eslint-disable-next-line no-console
          console.error('Failed to load scraper', f, err);
        }
      }
    }
  }

  if (scrapers.length === 0) {
    // fall back to example scraper
    const mod = require(path.join(__dirname, '..', 'scrapers', 'example.js'));
    scrapers.push({ name: 'example', run: mod.run });
  }

  const limit = pLimit(options.maxConcurrency || 2);
  const outputs = [];

  await Promise.all(scrapers.map((s) => limit(async () => {
    try {
      const out = await s.run({ outDir });
      if (Array.isArray(out) && out.length > 0) {
        for (const item of out) outputs.push(item);
      } else {
        // log zero-result scrapers as warnings (don't crash the whole run here)
        // eslint-disable-next-line no-console
        console.warn('Scraper returned zero items:', s.name);
      }
    } catch (err) {
      // per-scraper failure should not stop other scrapers
      // eslint-disable-next-line no-console
      console.error('Scraper failed:', s.name, err);
    }
  })));

  // deduplicate by id (keep first)
  const byId = new Map();
  for (const it of outputs) {
    if (it && typeof it.id === 'string') {
      if (!byId.has(it.id)) byId.set(it.id, it);
    }
  }
  const final = Array.from(byId.values());

  // Per CTO: treat zero-item result from all scrapers as an error
  if (final.length === 0) throw new Error('No items produced by scrapers');

  // validate (may return a filtered/normalized array)
  const validated = validate(final) || final;

  // write to outDir/ai_tools.json
  const dest = path.join(outDir, 'ai_tools.json');
  const content = JSON.stringify(validated, null, 2) + '\n';
  const backup = safeReplace.atomicReplace(dest, content);
  // eslint-disable-next-line no-console
  console.log('Wrote', dest, 'records=', validated.length, 'backup=', backup || 'none');
  return { dest, records: validated.length, backup };
}

module.exports = { run: runOnce };
