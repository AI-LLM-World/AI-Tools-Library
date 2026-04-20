import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
});

// Simple worker stub that logs a message and exits every interval
setInterval(async () => {
  // eslint-disable-next-line no-console
  console.log("Worker heartbeat - connected to Redis: ", await redis.ping());
}, 10000);
