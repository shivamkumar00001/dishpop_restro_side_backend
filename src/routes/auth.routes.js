const express = require("express");
const multer = require("multer");
const path = require("path");

const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  sendForgotOTP,
  verifyForgotOTP,
  resetPassword,
} = require("../controllers/auth.controller.js");

const isAuthenticated = require("../middlewares/isAuthenticated");

const router = express.Router();

/* ================================
   MULTER CONFIGURATION
================================= */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

/* ================================
   TEST ROUTE
================================= */
router.get("/test", (req, res) =>
  res.json({ success: true, message: "Auth router works!" })
);

/* ================================
   PUBLIC AUTH ROUTES
================================= */
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", sendForgotOTP);
router.post("/verify-forgot-otp", verifyForgotOTP);
router.post("/reset-password", resetPassword);

/* ================================
   LOGOUT (PROTECTED)
================================= */
router.post("/logout", isAuthenticated, logout);

/* ================================
   CHECK USERNAME AVAILABILITY
================================= */
router.get("/check-username", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || username.trim() === "") {
      return res.status(400).json({
        available: false,
        message: "Username required",
      });
    }

    const Owner = require("../models/Owner.model.js");
    const existingOwner = await Owner.findOne({
      username: username.trim().toLowerCase(),
    });

    if (existingOwner) {
      return res.json({
        available: false,
        message: "Username already taken",
      });
    }

    return res.json({
      available: true,
      message: "Username available",
    });
  } catch (err) {
    console.error("Check Username Error:", err);
    return res.status(500).json({
      available: false,
      message: "Server error",
    });
  }
});

/* ================================
   CURRENT LOGGED-IN USER
================================= */
router.get("/me", isAuthenticated, (req, res) => {
  const user = req.user;

  return res.json({
    success: true,
    user: {
      username: user.username,
      restaurantName: user.restaurantName,
      name: user.ownerName,
      email: user.email,
      phone: user.phone,
      profilePhoto: user.profilePhoto,
    },
  });
});

/* ================================
   PROFILE ROUTES
================================= */
router.get("/profile", isAuthenticated, getProfile);

router.put(
  "/profile",
  isAuthenticated,
  upload.single("profilePhoto"),
  updateProfile
);

module.exports = router;
