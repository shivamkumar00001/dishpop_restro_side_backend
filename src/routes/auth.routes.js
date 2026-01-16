// const express = require("express");
// const upload = require("../middlewares/upload");

// const {
//   register,
//   login,
//   logout,
//   getProfile,
//   updateProfile,
//   deleteGalleryImage,
//   getLandingPageData,
//   sendForgotOTP,
//   verifyForgotOTP,
//   resetPassword,
// } = require("../controllers/auth.controller.js");

// const isAuthenticated = require("../middlewares/isAuthenticated");

// const router = express.Router();

// /* ================================
//    TEST ROUTE
// ================================= */
// router.get("/test", (req, res) =>
//   res.json({ success: true, message: "Auth router works!" })
// );

// /* ================================
//    PUBLIC AUTH ROUTES
// ================================= */
// router.post("/register", register);
// router.post("/login", login);
// router.post("/forgot-password", sendForgotOTP);
// router.post("/verify-forgot-otp", verifyForgotOTP);
// router.post("/reset-password", resetPassword);

// /* ================================
//    LOGOUT (PROTECTED)
// ================================= */
// router.post("/logout", isAuthenticated, logout);

// /* ================================
//    CHECK USERNAME AVAILABILITY
// ================================= */
// router.get("/check-username", async (req, res) => {
//   try {
//     const { username } = req.query;

//     if (!username || username.trim() === "") {
//       return res.status(400).json({
//         available: false,
//         message: "Username required",
//       });
//     }

//     const Owner = require("../models/Owner.js");
//     const existingOwner = await Owner.findOne({
//       username: username.trim().toLowerCase(),
//     });

//     if (existingOwner) {
//       return res.json({
//         available: false,
//         message: "Username already taken",
//       });
//     }

//     return res.json({
//       available: true,
//       message: "Username available",
//     });
//   } catch (err) {
//     console.error("Check Username Error:", err);
//     return res.status(500).json({
//       available: false,
//       message: "Server error",
//     });
//   }
// });

// /* ================================
//    CURRENT LOGGED-IN USER
// ================================= */
// router.get("/me", isAuthenticated, (req, res) => {
//   const user = req.user;

//   return res.json({
//     success: true,
//     user: {
//       username: user.username,
//       restaurantName: user.restaurantName,
//       name: user.ownerName,
//       email: user.email,
//       phone: user.phone,
//       profilePhoto: user.profilePhoto,
//     },
//   });
// });

// /* ================================
//    PROFILE ROUTES (RESTAURANT SIDE)
// ================================= */
// router.get("/profile", isAuthenticated, getProfile);

// // 🔥 Updated to handle multiple images
// router.put(
//   "/profile",
//   isAuthenticated,
//   upload.fields([
//     { name: "profilePhoto", maxCount: 1 },
//     { name: "galleryImages", maxCount: 3 },
//   ]),
//   updateProfile
// );

// // 🔥 NEW: Delete gallery image
// router.delete(
//   "/profile/gallery/:imageId",
//   isAuthenticated,
//   deleteGalleryImage
// );

// /* ================================
//    PUBLIC LANDING PAGE (USER SIDE)
// ================================= */
// // 🔥 NEW: Get restaurant data for user-side landing page
// router.get("/:username/landing", getLandingPageData);

// module.exports = router;




const express = require("express");
const upload = require("../middlewares/upload");

const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  deleteGalleryImage,
  getLandingPageData,
  sendForgotOTP,
  verifyForgotOTP,
  resetPassword,
} = require("../controllers/auth.controller.js");

const isAuthenticated = require("../middlewares/isAuthenticated");

const router = express.Router();

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

    const Owner = require("../models/Owner.js");
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
   PROFILE ROUTES (RESTAURANT SIDE)
================================= */
router.get("/profile", isAuthenticated, getProfile);

router.put(
  "/profile",
  isAuthenticated,
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "galleryImages", maxCount: 3 },
  ]),
  updateProfile
);

// Delete gallery image
router.delete(
  "/profile/gallery/:imageId",
  isAuthenticated,
  deleteGalleryImage
);

/* ================================
   🔥 PUBLIC LANDING PAGE (USER SIDE)
   MUST BE AT THE END TO AVOID CONFLICTS
================================= */
router.get("/:username/landing", getLandingPageData);

module.exports = router;