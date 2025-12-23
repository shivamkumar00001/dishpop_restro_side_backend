const { createClient } = require("redis");

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis Client
 */
const initRedis = async () => {
  try {
    if (!process.env.REDIS_URL) {
      console.log("⚠️  Redis URL not configured, running without cache");
      return null;
    }

    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error("❌ Redis max reconnection attempts reached");
            return new Error("Redis connection failed");
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on("error", (err) => {
      console.error("❌ Redis Client Error:", err);
      isConnected = false;
    });

    redisClient.on("connect", () => {
      console.log("🔄 Redis connecting...");
    });

    redisClient.on("ready", () => {
      console.log("✅ Redis connected and ready");
      isConnected = true;
    });

    redisClient.on("reconnecting", () => {
      console.log("🔄 Redis reconnecting...");
      isConnected = false;
    });

    redisClient.on("end", () => {
      console.log("🔌 Redis connection closed");
      isConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error("❌ Failed to initialize Redis:", error.message);
    return null;
  }
};

/**
 * Get Redis Client
 */
const getRedisClient = () => {
  return isConnected ? redisClient : null;
};

/**
 * Check if Redis is connected
 */
const isRedisConnected = () => {
  return isConnected;
};

/**
 * Set value in Redis with TTL
 */
const setCache = async (key, value, ttlSeconds = 300) => {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Redis SET error:", error);
    return false;
  }
};

/**
 * Get value from Redis
 */
const getCache = async (key) => {
  try {
    const client = getRedisClient();
    if (!client) return null;

    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Redis GET error:", error);
    return null;
  }
};

/**
 * Delete value from Redis
 */
const deleteCache = async (key) => {
  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.del(key);
    return true;
  } catch (error) {
    console.error("Redis DELETE error:", error);
    return false;
  }
};

/**
 * Delete multiple keys matching pattern
 */
const deleteCachePattern = async (pattern) => {
  try {
    const client = getRedisClient();
    if (!client) return false;

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (error) {
    console.error("Redis DELETE PATTERN error:", error);
    return false;
  }
};

/**
 * Close Redis connection
 */
const closeRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      console.log("✅ Redis connection closed gracefully");
    }
  } catch (error) {
    console.error("❌ Error closing Redis:", error);
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  isRedisConnected,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  closeRedis,
};
