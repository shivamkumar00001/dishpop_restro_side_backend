const router = require("express").Router();
const auth = require("../middlewares/isAuthenticated");
const {
  getComputedSubscriptionStatus,
} = require("../controllers/subscriptionStatus.controller");

router.get("/me", auth, getComputedSubscriptionStatus);

module.exports = router;
