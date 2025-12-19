const redis = require("./redis");

module.exports = function orderEventsBridge(io) {
  if (!redis) {
    console.warn("⚠️ orderEventsBridge skipped (Redis disabled)");
    return;
  }

  console.log("🔁 Order Events Bridge initialized");

  // 🔁 Use a dedicated Redis SUB connection
  const sub = redis.duplicate();

  // ✅ MUST match customer backend publish channel
  const CHANNEL = "orders-events";

  sub.subscribe(CHANNEL, (err) => {
    if (err) {
      console.error("❌ Redis subscribe failed:", err.message);
    } else {
      console.log(`📡 Subscribed to Redis channel: ${CHANNEL}`);
    }
  });

  sub.on("message", (channel, message) => {
    if (channel !== CHANNEL) return;

    try {
      const { type, username, data } = JSON.parse(message);

      // 🔁 Translate customer → restaurant frontend events
      const socketEvent = normalizeEvent(type);
      if (!socketEvent) {
        console.warn("⚠️ Unknown order event:", type);
        return;
      }

      const roomSize =
        io.sockets.adapter.rooms.get(username)?.size || 0;

      console.log(
        `📡 Redis → Socket | ${type} → ${socketEvent} | room=${username} | listeners=${roomSize}`
      );

      // ✅ Emit to restaurant room
      io.to(username).emit(socketEvent, data);

    } catch (err) {
      console.error("❌ Redis message parse error:", err.message);
    }
  });

  sub.on("error", (err) => {
    console.error("❌ Redis subscriber error:", err.message);
  });
};

// 🔁 EVENT NAME TRANSLATOR
function normalizeEvent(type) {
  switch (type) {
    case "order-created":
      return "created";
    case "order-updated":
      return "updated";
    case "order-replaced":
      return "replaced";
    default:
      return null;
  }
}
