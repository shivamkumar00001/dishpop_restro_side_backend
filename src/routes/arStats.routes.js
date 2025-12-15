const express = require("express");
const router = express.Router();

const {
  trackARClick,
  getTopARDishes,
  getWeeklyARStats,
} = require("../controllers/arStats.controller");

// USER SIDE
router.post("/click", trackARClick);

// DASHBOARD
router.get("/top", getTopARDishes);
router.get("/weekly", getWeeklyARStats);

module.exports = router;
