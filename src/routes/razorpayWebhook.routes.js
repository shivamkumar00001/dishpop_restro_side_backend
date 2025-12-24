const express = require("express");
const router = express.Router();

const {
  handleRazorpayWebhook
} = require("../controllers/razorpayWebhook.controller");

// ⚠️ IMPORTANT: NO auth middleware on webhook
router.post(
  "/razorpay",
  express.json({ type: "application/json" }),
  handleRazorpayWebhook
);

module.exports = router;
