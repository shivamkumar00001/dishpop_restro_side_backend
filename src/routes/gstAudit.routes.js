const express = require("express");
const isAuthenticated = require("../middlewares/isAuthenticated");

const {
  getGSTAuditLogs,
  getGSTSummary,
  getMonthlyReport,
  getTaxRateBreakdown,
  exportGSTAuditToExcel,
} = require("../controllers/gstAuditController");

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// GET routes
router.get("/:username/logs", getGSTAuditLogs);
router.get("/:username/summary", getGSTSummary);
router.get("/:username/monthly", getMonthlyReport);
router.get("/:username/tax-breakdown", getTaxRateBreakdown);
router.get("/:username/export", exportGSTAuditToExcel);

module.exports = router;