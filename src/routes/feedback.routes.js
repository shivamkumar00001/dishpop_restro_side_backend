const express = require("express");
const router = express.Router();

const {
  getFeedbackSummary,
} = require("../controllers/feedback.controller");

// DASHBOARD
router.get("/summary", getFeedbackSummary);

module.exports = router;
