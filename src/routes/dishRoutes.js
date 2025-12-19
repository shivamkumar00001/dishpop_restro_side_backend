const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload.middleware");
const isAuthenticated = require("../middlewares/isAuthenticated");

const {
  getDish,
  updateDish,
  deleteDish,
} = require("../controllers/dishController");

// Get single dish
router.get("/restaurants/:username/dishes/:dishId", getDish);

// Update dish
router.patch(
  "/restaurants/:username/dishes/:dishId",
  isAuthenticated,
  upload.single("image"),
  updateDish
);

// Delete dish
router.delete(
  "/restaurants/:username/dishes/:dishId",
  isAuthenticated,
  deleteDish
);

module.exports = router;