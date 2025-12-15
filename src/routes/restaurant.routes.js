const express = require("express");
const router = express.Router();

const {
  getRestaurantByUsername,
  getMyRestaurant,
} = require("../controllers/restaurant.controller.js");

const isAuthenticated = require("../middlewares/isAuthenticated");

// protect ALL restaurant routes
router.use(isAuthenticated);

// logged-in user restaurant
router.get("/me", getMyRestaurant);

// public: access by username
router.get("/:username", getRestaurantByUsername);

module.exports = router;
