// src/routes/dishRoutes.js

const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload.middleware");
const isAuthenticated = require("../middlewares/isAuthenticated");

const {
  getDish,
  updateDish,
  deleteDish
} = require("../controllers/dishController");

// ==========================================================
// GET SINGLE DISH  (PUBLIC)
// /api/v1/restaurants/:username/dishes/:dishId
// ==========================================================
router.get(
  "/restaurants/:username/dishes/:dishId",
  getDish
);

// ==========================================================
// UPDATE DISH (PROTECTED)
// ==========================================================
router.patch(
  "/restaurants/:username/dishes/:dishId",
  isAuthenticated,
  upload.single("image"),
  updateDish
);

// ==========================================================
// DELETE DISH (PROTECTED)
// ==========================================================
router.delete(
  "/restaurants/:username/dishes/:dishId",
  isAuthenticated,
  deleteDish
);

module.exports = router;
