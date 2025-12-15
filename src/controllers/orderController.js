const Customer = require("../models/customers");
const redis = require("../config/redis");

// ============================
// GET RESTAURANT ORDERS (REDIS CACHED)
// ============================
exports.getRestaurantOrders = async (req, res) => {
  try {
    const { username } = req.params;

    // 🔐 Security check
    if (req.user.username !== username) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const cacheKey = `orders:${username}`;

    // 1️⃣ Try Redis first (FASTEST)
    const cachedOrders = await redis.get(cacheKey);
    if (cachedOrders) {
      return res.json(JSON.parse(cachedOrders));
    }

    // 2️⃣ Fetch from MongoDB
    const orders = await Customer.find({ username })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // 3️⃣ Store in Redis (TTL = 10 seconds)
    await redis.set(cacheKey, JSON.stringify(orders), "EX", 10);

    res.json(orders);
  } catch (err) {
    console.error("GET ORDERS ERROR:", err);
    res.status(500).json({ message: "Failed to load orders" });
  }
};

// ============================
// UPDATE ORDER STATUS (REDIS INVALIDATION)
// ============================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { username, orderId } = req.params;
    const { status } = req.body;

    // 🔐 Security check
    if (req.user.username !== username) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const order = await Customer.findOneAndUpdate(
      { _id: orderId, username },
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 🧹 Clear Redis cache
    await redis.del(`orders:${username}`);

    // 🔴 Live socket update
    req.io.to(username).emit("order-updated", order);

    res.json(order);
  } catch (err) {
    console.error("UPDATE ORDER ERROR:", err);
    res.status(500).json({ message: "Update failed" });
  }
};
