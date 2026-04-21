/**
 * Thin CLI wrapper that delegates scraping work to runner.run.
 * Exposes run() for the integration test harness.
 */
const fs = require('fs');
const path = require('path');

const runner = require('./runner');
const cronStarter = require('./cron');

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

// Re-export runner for test harness
module.exports.run = runner.run;

if (require.main === module) {
  (async () => {
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
      if (opts.once) {
        await runner.run(opts.outDir);
        process.exit(0);
      }

      // Start cron-based scheduling (default SCRAPE_CRON or 0 2 * * * UTC)
      cronStarter.start(opts.outDir);

      // Keep process alive
      // eslint-disable-next-line no-console
      console.log('Scraper runner started in scheduled mode');
    } catch (err) {
      console.error('Scraper run failed', err);
      process.exit(1);
    }
  })();
}
