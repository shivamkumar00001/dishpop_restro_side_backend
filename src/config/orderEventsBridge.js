const redis = require("./redisSubscriber.js");

let isSubscribed = false;

module.exports = function orderEventsBridge(io) {
  // 🛑 Prevent duplicate subscriptions
  if (isSubscribed) return;
  isSubscribed = true;

  redis.on("ready", () => {
    console.log("✅ Redis subscriber connected (restaurant backend)");
  });

  redis.on("error", (err) => {
    console.error("❌ Redis subscriber error:", err.message);
  });

  redis.subscribe("orders-events", (err) => {
    if (err) {
      console.error("❌ Redis subscribe failed:", err);
    } else {
      console.log("📡 Subscribed to Redis channel: orders-events");
    }
  });

  redis.on("message", (channel, message) => {
    if (channel !== "orders-events") return;

    try {
      const { type, username, data } = JSON.parse(message);

      if (!type || !username) return;

      io.to(username).emit(type, data);

      console.log(`📡 Redis → Socket: ${type} → ${username}`);
    } catch (err) {
      console.error("❌ Redis message parse error:", err.message);
    }
  });
};
