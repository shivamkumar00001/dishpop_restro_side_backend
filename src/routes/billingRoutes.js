const express = require("express");
const isAuthenticated = require("../middlewares/isAuthenticated");

const {
  getAllBills,
  getBillById,
  createBillFromOrders,
  createBillFromSelectedItems,
  createBillManually,
  updateBillItems,
  updateBillCharges,
  mergeBills,
  finalizeBill,
  getActiveSessions,
  getSessionDetails,
  getBillsByTable,
  deleteBill,
  getBillingStats,
} = require("../controllers/billingController");

const router = express.Router();

// GET routes
router.get("/restaurants/:username/bills", isAuthenticated, getAllBills);
router.get("/restaurants/:username/bills/stats", isAuthenticated, getBillingStats);
router.get("/restaurants/:username/bills/table/:tableNumber", isAuthenticated, getBillsByTable);
router.get("/restaurants/:username/bills/:billId", isAuthenticated, getBillById);
router.get("/restaurants/:username/sessions", isAuthenticated, getActiveSessions);
router.get("/restaurants/:username/sessions/:sessionId", isAuthenticated, getSessionDetails);

// POST routes
router.post("/restaurants/:username/bills/create-from-orders", isAuthenticated, createBillFromOrders);
router.post("/restaurants/:username/bills/create-from-selected-items", isAuthenticated, createBillFromSelectedItems);
router.post("/restaurants/:username/bills/create", isAuthenticated, createBillManually);
router.post("/restaurants/:username/bills/merge", isAuthenticated, mergeBills);
router.post("/restaurants/:username/bills/:billId/finalize", isAuthenticated, finalizeBill);

// PATCH routes
router.patch("/restaurants/:username/bills/:billId/items", isAuthenticated, updateBillItems);
router.patch("/restaurants/:username/bills/:billId/charges", isAuthenticated, updateBillCharges);

// DELETE routes
router.delete("/restaurants/:username/bills/:billId", isAuthenticated, deleteBill);

module.exports = router;