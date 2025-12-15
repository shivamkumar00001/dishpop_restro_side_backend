const Owner = require("../models/Owner.model");

// ===============================
// GET restaurant by username (Public)
// ===============================
exports.getRestaurantByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const restaurant = await Owner.findOne({ username }).select(
      "-password -verificationCode -verificationCodeExpire -resetOTP -resetOTPExpire"
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    return res.json({
      success: true,
      restaurant,
    });
  } catch (err) {
    console.error("getRestaurantByUsername ERROR:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ==============================================
// GET my restaurant (logged-in user)
// Uses: req.user.username
// ==============================================
exports.getMyRestaurant = async (req, res) => {
  try {
    const username = req.user.username;

    const restaurant = await Owner.findOne({ username }).select(
      "-password -verificationCode -verificationCodeExpire -resetOTP -resetOTPExpire"
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found for this account",
      });
    }

    return res.json({
      success: true,
      restaurant,
    });
  } catch (err) {
    console.error("getMyRestaurant ERROR:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
