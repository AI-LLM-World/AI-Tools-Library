/**
 * Simple scraper runner.
 *
 * Usage:
 *   node src/index.js --out-dir /path/to/data --once
 *
 * The script loads all scrapers under ./scrapers and runs them in sequence,
 * merging results. On success it validates the output and atomically writes
 * it to <out-dir>/ai_tools.json, keeping a timestamped backup of previous file.
 *
 * This intentionally avoids external dependencies to keep the bootstrap small.
 */

const fs = require('fs');
const path = require('path');

const safeReplace = require('./safeReplace');
const validate = require('./validate');

async function runOnce(outDir) {
  const scrapersDir = path.join(__dirname, 'scrapers');
  const scrapers = [];

  // load all .js scrapers in scrapersDir
  if (fs.existsSync(scrapersDir)) {
    // read and sort filenames so load order is deterministic (first-wins dedupe)
    let files = fs.readdirSync(scrapersDir).filter((f) => f.endsWith('.js'));
    files = files.sort();
    for (const f of files) {
      try {
        const mod = require(path.join(scrapersDir, f));
        if (typeof mod.run === 'function') {
          scrapers.push(mod.run);
        } else {
          // better logging when a scraper module does not match the expected API
          console.warn('Scraper module does not export run():', f);
        }
      } catch (err) {
        console.error('Failed to load scraper', f, err);
      }
    }
  }

  if (scrapers.length === 0) {
    console.log('No scrapers found; using default example scraper');
    const mod = require(path.join(__dirname, '..', 'scrapers', 'example.js'));
    scrapers.push(mod.run);
  }

  const outputs = [];
  for (const s of scrapers) {
    try {
      const out = await s({ outDir });
      if (Array.isArray(out)) outputs.push(...out);
    } catch (err) {
      console.error('Scraper failed:', err);
    }
  }

  // deduplicate by id (keep first)
  const byId = new Map();
  for (const it of outputs) {
    if (it && typeof it.id === 'string') {
      if (!byId.has(it.id)) byId.set(it.id, it);
    }
  }
  const final = Array.from(byId.values());

  // validate - validate may return a filtered list (when AJV is present)
  // ensure we use the returned, validated items to avoid writing invalid data
  const validated = validate(final);
  // prefer the validated array (validate returns the original root when AJV is absent)
  const finalValidated = Array.isArray(validated) ? validated : final;

  // write to outDir/ai_tools.json
  const dest = path.join(outDir, 'ai_tools.json');
  const content = JSON.stringify(finalValidated, null, 2) + '\n';
  const backup = safeReplace.atomicReplace(dest, content);
  console.log('Wrote', dest, 'records=', finalValidated.length, 'backup=', backup || 'none');
  return { dest, records: finalValidated.length, backup };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { outDir: path.resolve(process.cwd(), 'data'), once: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--out-dir' && i + 1 < args.length) {
      out.outDir = path.resolve(args[++i]);
    } else if (a.startsWith('--out-dir=')) {
      out.outDir = path.resolve(a.split('=')[1]);
    } else if (a === '--once') {
      out.once = true;
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    }
  }
  return out;
}

async function main() {
  const opts = parseArgs();
  if (opts.help) {
    console.log('Usage: node src/index.js [--out-dir DIR] [--once]');
    process.exit(0);
  }

  // ensure outDir exists
  try {
    fs.mkdirSync(opts.outDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create out dir', opts.outDir, err);
    process.exit(2);
  }

  try {
    await runOnce(opts.outDir);
    if (!opts.once) {
      // if not once, run periodically every hour (simple setInterval)
      console.log('Entering periodic mode: running every hour. Use --once to exit after a single run.');
      setInterval(async () => {
        try { await runOnce(opts.outDir); } catch (e) { console.error('Periodic run failed', e); }
      }, 1000 * 60 * 60);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Scraper run failed', err);
    process.exit(1);
  }
}

// Export run function for test harness
module.exports.run = runOnce;

if (require.main === module) main();
