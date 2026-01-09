const express = require("express");
const router = express.Router();
const tagController = require("../controllers/TagController");
// Uncomment if you have auth middleware
// const { protect, adminOnly } = require("../middlewares/auth");

/* ===============================
   PUBLIC ROUTES
================================ */

// Get all active tags
router.get("/", tagController.getAllTags);

// Get single tag by key
router.get("/:key", tagController.getTagByKey);

/* ===============================
   ADMIN ROUTES (Protected)
   Uncomment when auth is ready
================================ */

// Update tag (order, active status only)
// router.put(
//   "/admin/:key",
//   protect,
//   adminOnly,
//   tagController.updateTag
// );

module.exports = router;