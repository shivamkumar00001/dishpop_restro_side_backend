const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload.middleware");
const isAuthenticated = require("../middlewares/isAuthenticated");

const Dish = require("../models/Dish");
const {
  getMenu,
  createDish,
  deleteDish
} = require("../controllers/menu.controller");

const { getDish } = require("../controllers/dishController");

/* ==========================================================
   GET ALL CATEGORIES (BY USERNAME)
========================================================== */
router.get("/restaurants/:username/categories", async (req, res) => {
  try {
    const { username } = req.params;

    const categories = await Dish.distinct("category", { username });

    return res.json({ success: true, data: categories });
  } catch (err) {
    console.error("Category fetch error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching categories"
    });
  }
});

/* ==========================================================
   GET MENU (BY USERNAME)
========================================================== */
router.get("/restaurants/:username/menu", getMenu);

/* ==========================================================
   CREATE DISH (PROTECTED)
========================================================== */
router.post(
  "/restaurants/:username/menu",
  isAuthenticated,
  upload.single("image"),
  createDish
);

module.exports = router;
