const Redis = require("ioredis");

let redis = null;

/**
 * 🔴 REDIS OFF (LOCAL / DEV)
 */
if (process.env.ENABLE_REDIS !== "true") {
  console.warn("⚠️ Redis disabled (ENABLE_REDIS=false)");
  module.exports = null;
  return;
}

/**
 * 🔐 REDIS ON (PROD / UPSTASH)
 */
if (!process.env.REDIS_URL) {
  console.error("❌ ENABLE_REDIS=true but REDIS_URL missing");
  process.exit(1);
}

redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    if (times > 3) {
      console.error("❌ Redis retry limit reached, stopping retries");
      return null;
    }
    return Math.min(times * 1000, 3000);
  },
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("ready", () => {
  console.log("🚀 Redis ready");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});

module.exports = redis;
