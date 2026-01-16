const express = require("express");
const router = express.Router();

const {
  setupBilling,
  getMyBilling,
  updateMyBilling, // ⬅️ ADD THIS
} = require("../controllers/billinggController");

const isAuthenticated = require("../middlewares/isAuthenticated");

router.post("/setup", isAuthenticated, setupBilling);
router.get("/me", isAuthenticated, getMyBilling);
router.put("/me", isAuthenticated, updateMyBilling); // ⬅️ EDIT BILLING DETAILS

module.exports = router;
