const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middlewares/isAuthenticated");
const {
  getRestaurantOrders,
  updateOrderStatus,
} = require("../controllers/orderController");

// GET ORDERS
router.get(
  "/restaurants/:username/orders",
  isAuthenticated,
  getRestaurantOrders
);

// UPDATE STATUS
router.patch(
  "/restaurants/:username/orders/:orderId/status",
  isAuthenticated,
  updateOrderStatus
);

module.exports = router;
