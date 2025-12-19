const express = require("express");
const router = express.Router();

const isAuthenticated = require("../middlewares/isAuthenticated");
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");

// Get categories
router.get("/:username/categories", getCategories);

// Create category
router.post("/:username/categories", isAuthenticated, createCategory);

// Update category
router.patch(
  "/:username/categories/:categoryId",
  isAuthenticated,
  updateCategory
);

// Delete category
router.delete(
  "/:username/categories/:categoryId",
  isAuthenticated,
  deleteCategory
);

module.exports = router;