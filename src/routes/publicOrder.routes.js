const express = require("express");
const {
  getPublicOrdersByRestaurant,
} = require("../controllers/publicOrder.controller");

const router = express.Router();

// PUBLIC CUSTOMER ORDER STATUS
router.get(
  "/public/restaurants/:username/orders",
  getPublicOrdersByRestaurant
);

module.exports = router;
