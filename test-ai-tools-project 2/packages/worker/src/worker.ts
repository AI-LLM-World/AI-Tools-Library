import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  // simple retry strategy to avoid tight reconnect loops
  retryStrategy: (times) => Math.min(2000, times * 100),
});

redis.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Redis error:", err);
});

async function heartbeat() {
  try {
    const pong = await redis.ping();
    // eslint-disable-next-line no-console
    console.log("Worker heartbeat - connected to Redis:", pong);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Worker heartbeat failed:", err);
  }
}

const interval = setInterval(heartbeat, 10000);

process.on("SIGINT", async () => {
  // eslint-disable-next-line no-console
  console.log("Worker shutting down");
  clearInterval(interval);
  try {
    await redis.quit();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error closing Redis connection", err);
  } finally {
    process.exit(0);
  }
});

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("Unhandled promise rejection in worker:", reason);
});
