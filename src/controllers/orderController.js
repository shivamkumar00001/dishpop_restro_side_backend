const Customer = require("../models/customers.js");
const asyncHandler = require("../middlewares/asyncHandler.js");
const ErrorHandler = require("../utils/ErrorHandler.js");
const { setCache, getCache, deleteCache, deleteCachePattern } = require("../config/redis.js");

// Cache TTL (5 minutes)
const CACHE_TTL = 300;

// ===============================
// @desc    Get all orders for a restaurant
// @route   GET /api/v1/restaurants/:username/orders
// @access  Private
// ===============================
exports.getRestaurantOrders = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { status, tableNumber, startDate, endDate, limit = 100 } = req.query;

  // Verify ownership
  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  // Create cache key
  const cacheKey = `orders:${username}:${status || "all"}:${tableNumber || "all"}:${startDate || ""}:${endDate || ""}:${limit}`;

  // Try to get from cache
  const cachedData = await getCache(cacheKey);
  if (cachedData) {
    console.log("📦 Serving from cache:", cacheKey);
    return res.status(200).json({
      success: true,
      cached: true,
      count: cachedData.orders.length,
      stats: cachedData.stats,
      data: cachedData.orders,
    });
  }

  // Build query
  const query = { username };

  // Filter by status
  if (status && status !== "all") {
    if (status === "active") {
      query.status = { $in: ["pending", "confirmed"] };
    } else {
      query.status = status;
    }
  }

  // Filter by table number
  if (tableNumber) {
    query.tableNumber = parseInt(tableNumber);
  }

  // Filter by date range
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Execute query
  const orders = await Customer.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  // Calculate statistics
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  // Cache the result
  await setCache(cacheKey, { orders, stats }, CACHE_TTL);

  res.status(200).json({
    success: true,
    cached: false,
    count: orders.length,
    stats,
    data: orders,
  });
});

// ===============================
// @desc    Get single order by ID
// @route   GET /api/v1/restaurants/:username/orders/:orderId
// @access  Private
// ===============================
exports.getOrderById = asyncHandler(async (req, res, next) => {
  const { username, orderId } = req.params;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  // Try cache first
  const cacheKey = `order:${orderId}`;
  const cachedOrder = await getCache(cacheKey);
  
  if (cachedOrder) {
    return res.status(200).json({
      success: true,
      cached: true,
      data: cachedOrder,
    });
  }

  const order = await Customer.findOne({
    _id: orderId,
    username,
  }).lean();

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  // Cache the order
  await setCache(cacheKey, order, CACHE_TTL);

  res.status(200).json({
    success: true,
    cached: false,
    data: order,
  });
});

// ===============================
// @desc    Update order status
// @route   PATCH /api/v1/restaurants/:username/orders/:orderId/status
// @access  Private
// ===============================
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { username, orderId } = req.params;
  const { status } = req.body;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  // Validate status
  const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
  if (!status || !validStatuses.includes(status)) {
    return next(
      new ErrorHandler(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        400
      )
    );
  }

  // Update order
  const order = await Customer.findOneAndUpdate(
    { _id: orderId, username },
    { status, updatedAt: new Date() },
    { new: true, runValidators: true }
  );

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  // Invalidate cache
  await deleteCache(`order:${orderId}`);
  await deleteCachePattern(`orders:${username}:*`);

  // Emit socket event
  if (req.io) {
    req.io.to(`restaurant:${username}`).emit("order:updated", {
      type: "updated",
      order: order.toObject(),
      timestamp: Date.now(),
    });
  }

  res.status(200).json({
    success: true,
    message: `Order status updated to ${status}`,
    data: order,
  });
});

// ===============================
// @desc    Delete order
// @route   DELETE /api/v1/restaurants/:username/orders/:orderId
// @access  Private
// ===============================
exports.deleteOrder = asyncHandler(async (req, res, next) => {
  const { username, orderId } = req.params;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const order = await Customer.findOneAndDelete({
    _id: orderId,
    username,
  });

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  // Invalidate cache
  await deleteCache(`order:${orderId}`);
  await deleteCachePattern(`orders:${username}:*`);

  // Emit socket event
  if (req.io) {
    req.io.to(`restaurant:${username}`).emit("order:deleted", {
      type: "deleted",
      orderId: order._id.toString(),
      timestamp: Date.now(),
    });
  }

  res.status(200).json({
    success: true,
    message: "Order deleted successfully",
  });
});

// ===============================
// @desc    Get order statistics
// @route   GET /api/v1/restaurants/:username/orders/stats
// @access  Private
// ===============================
exports.getOrderStatistics = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { period = "today" } = req.query;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  // Try cache
  const cacheKey = `stats:${username}:${period}`;
  const cachedStats = await getCache(cacheKey);
  
  if (cachedStats) {
    return res.status(200).json({
      success: true,
      cached: true,
      period,
      data: cachedStats,
    });
  }

  // Calculate date range
  let startDate = new Date();
  switch (period) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "week":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "all":
      startDate = new Date(0);
      break;
    default:
      startDate.setHours(0, 0, 0, 0);
  }

  // Aggregation pipeline
  const stats = await Customer.aggregate([
    {
      $match: {
        username,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: "$grandTotal" },
        avgOrderValue: { $avg: "$grandTotal" },
        pending: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        confirmed: {
          $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
        },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
      },
    },
  ]);

  // Popular items
  const popularItems = await Customer.aggregate([
    {
      $match: {
        username,
        createdAt: { $gte: startDate },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.itemId",
        name: { $first: "$items.name" },
        totalOrdered: { $sum: "$items.qty" },
        revenue: { $sum: "$items.totalPrice" },
      },
    },
    { $sort: { totalOrdered: -1 } },
    { $limit: 10 },
  ]);

  const result = {
    overview: stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    },
    popularItems,
  };

  // Cache for 2 minutes
  await setCache(cacheKey, result, 120);

  res.status(200).json({
    success: true,
    cached: false,
    period,
    data: result,
  });
});

// ===============================
// @desc    Get orders by table
// @route   GET /api/v1/restaurants/:username/orders/table/:tableNumber
// @access  Private
// ===============================
exports.getOrdersByTable = asyncHandler(async (req, res, next) => {
  const { username, tableNumber } = req.params;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const orders = await Customer.find({
    username,
    tableNumber: parseInt(tableNumber),
  })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});