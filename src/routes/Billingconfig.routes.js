const express = require("express");
const isAuthenticated = require("../middlewares/isAuthenticated");

const {
  getBillingConfig,
  setupBillingConfig,
  deleteBillingConfig,
} = require("../controllers/Billingconfig.controller");

const router = express.Router();

// Public route for fetching config (needed for printing bills)
router.get("/config/:username", getBillingConfig);

// Protected routes (require authentication)
router.post("/setup", isAuthenticated, setupBillingConfig);
router.delete("/config", isAuthenticated, deleteBillingConfig);

module.exports = router;