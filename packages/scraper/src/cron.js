const cron = require('node-cron');
const runner = require('./runner');

// Default: daily at 02:00 UTC
const scheduleExpr = process.env.SCRAPE_CRON || '0 2 * * *';
const timezone = 'UTC';

function start(outDir) {
  // schedule the runner. Use timezone UTC by default to make behaviour explicit.
  try {
    // eslint-disable-next-line no-console
    console.log('Scheduling scraper runs with', scheduleExpr, 'timezone=', timezone);
    cron.schedule(scheduleExpr, async () => {
      try {
        // eslint-disable-next-line no-console
        console.log('Scheduled run triggered');
        await runner.run(outDir);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Scheduled run failed', err);
      }
    }, { timezone });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to schedule scraper cron:', err);
    throw err;
  }
}

module.exports = { start };
