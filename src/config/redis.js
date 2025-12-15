const Redis = require("ioredis");

if (!process.env.REDIS_URL) {
  throw new Error("❌ REDIS_URL is missing in environment variables");
}

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,     // prevent crash loops
  enableReadyCheck: true,
  retryStrategy(times) {
    if (times > 5) {
      console.error("❌ Redis retry limit reached, stopping retries");
      return null; // STOP retrying
    }
    return Math.min(times * 1000, 5000);
  },
});

redis.on("connect", () => {
  console.log("✅ Redis connected (Upstash)");
});

redis.on("ready", () => {
  console.log("🚀 Redis ready to use");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});

module.exports = redis;
