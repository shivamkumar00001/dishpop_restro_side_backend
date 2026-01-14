const express = require("express");
const isAuthenticated = require("../middlewares/isAuthenticated");

const {
  getAllCustomers,
  getCustomerStats,
  getRepeatCustomers,
  getTopCustomers,
  getInactiveCustomers,
  exportToExcel,
  getCustomerByPhone,
  updateCustomer,
  recordVisit,
} = require("../controllers/CustomerAnalytics");

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// GET routes
router.get("/:username/customers", getAllCustomers);
router.get("/:username/stats", getCustomerStats);
router.get("/:username/repeat-customers", getRepeatCustomers);
router.get("/:username/top-customers", getTopCustomers);
router.get("/:username/inactive-customers", getInactiveCustomers);
router.get("/:username/export-excel", exportToExcel);
router.get("/:username/customer/:phoneNumber", getCustomerByPhone);

// POST routes
router.post("/:username/record-visit", recordVisit);

// PATCH routes
router.patch("/:username/customer/:phoneNumber", updateCustomer);

module.exports = router;