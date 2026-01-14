const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload.middleware");
const isAuthenticated = require("../middlewares/isAuthenticated");

const {
  getMenu,
  createDish,
  attachAddOnsToDish,
  toggleDishAvailability,
} = require("../controllers/menu.controller");

// Get full menu
router.get("/restaurants/:username/menu", getMenu);

// Create dish
router.post(
  "/restaurants/:username/menu",
  isAuthenticated,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "arGlb", maxCount: 1 },
    { name: "arUsdz", maxCount: 1 },
  ]),
  createDish
);

// Attach add-ons to dish
router.patch(
  "/restaurants/:username/menu/:dishId/addons",
  isAuthenticated,
  attachAddOnsToDish
);

// Toggle dish availability
router.patch(
  "/restaurants/:username/menu/:dishId/toggle",
  isAuthenticated,
  toggleDishAvailability
);

module.exports = router;