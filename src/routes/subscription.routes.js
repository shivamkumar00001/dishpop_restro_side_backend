const express = require("express");
const router = express.Router();
const { createSubscription, getSubscriptionStatus } = require("../controllers/subscription.controller");
const isAuthenticated = require("../middlewares/isAuthenticated");

// Create a new subscription
router.post("/create", isAuthenticated, createSubscription);

// 🔹 Get current subscription status
router.get("/status", isAuthenticated, getSubscriptionStatus);

module.exports = router;
