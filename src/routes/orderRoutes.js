const express = require("express");
const isAuthenticated = require("../middlewares/isAuthenticated");

const {
  getRestaurantOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getOrderStatistics,
  getOrdersByTable,
} = require("../controllers/orderController");

const router = express.Router();

// ===============================
// ORDER MANAGEMENT ROUTES
// ===============================

// GET all orders for a restaurant
router.get(
  "/restaurants/:username/orders",
  isAuthenticated,
  getRestaurantOrders
);

// GET order statistics
router.get(
  "/restaurants/:username/orders/stats",
  isAuthenticated,
  getOrderStatistics
);

// GET orders by table number
router.get(
  "/restaurants/:username/orders/table/:tableNumber",
  isAuthenticated,
  getOrdersByTable
);

// GET single order by ID
router.get(
  "/restaurants/:username/orders/:orderId",
  isAuthenticated,
  getOrderById
);

// UPDATE order status
router.patch(
  "/restaurants/:username/orders/:orderId/status",
  isAuthenticated,
  updateOrderStatus
);

// DELETE order
router.delete(
  "/restaurants/:username/orders/:orderId",
  isAuthenticated,
  deleteOrder
);

module.exports = router;
