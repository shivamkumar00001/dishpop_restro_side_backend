// ==================== IMPORTS ====================
const ErrorHandler = require("../utils/ErrorHandler.js");
const catchAsyncError = require("../middlewares/catchAsyncError.js");
const Owner = require("../models/Owner.js");
const sendEmail = require("../utils/sendEmail.js");
const sendToken = require("../utils/sendToken.js");
const Dish = require("../models/Dish.js");
const Review = require("../models/reviews.js");
const {
  uploadToCloudflare,
  deleteFromCloudflare,
} = require("../utils/cloudflareUpload.js");

// Normalize email
const normalizeEmail = (email = "") => email.toString().trim().toLowerCase();

// ==================== REGISTER ====================
const register = catchAsyncError(async (req, res, next) => {
  let {
    username,
    restaurantName,
    ownerName,
    email,
    phone,
    state,
    city,
    pincode,
    restaurantType,
    password,
    confirmPassword,
  } = req.body;

  email = normalizeEmail(email);

  if (
    !username?.trim() ||
    !restaurantName?.trim() ||
    !ownerName?.trim() ||
    !email?.trim() ||
    !phone?.trim() ||
    !password?.trim() ||
    !confirmPassword?.trim()
  ) {
    return next(new ErrorHandler("Required fields missing.", 400));
  }

  // Username validation
  const usernameRegex = /^[a-zA-Z0-9._]{3,30}$/;
  if (!usernameRegex.test(username)) {
    return next(
      new ErrorHandler(
        "Username must be 3-30 characters long and only include letters, numbers, dots or underscores.",
        400
      )
    );
  }

  // Password validation
  if (password !== confirmPassword)
    return next(new ErrorHandler("Passwords do not match.", 400));

  const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return next(
      new ErrorHandler(
        "Password must be 8+ characters with uppercase, lowercase, and number.",
        400
      )
    );
  }

  // Check duplicate user
  const existing = await Owner.findOne({
    $or: [{ email }, { phone }, { username }],
  });

  if (existing)
    return next(
      new ErrorHandler("Email, phone, or username already used.", 400)
    );

  // Create user
  const user = await Owner.create({
    username,
    restaurantName,
    ownerName,
    email,
    phone,
    state,
    city,
    pincode,
    restaurantType,
    password,
    accountVerified: true,
  });

  return sendToken(user, 201, "Registration successful.", res);
});

// ==================== LOGIN ====================
const login = catchAsyncError(async (req, res, next) => {
  const { identifier, password } = req.body;

  if (!identifier?.trim() || !password?.trim()) {
    return next(new ErrorHandler("Provide username/email and password.", 400));
  }

  const isEmail = identifier.includes("@");
  let user;

  if (isEmail) {
    user = await Owner.findOne({
      email: normalizeEmail(identifier),
    }).select("+password");
  } else {
    user = await Owner.findOne({
      username: new RegExp(`^${identifier}$`, "i"),
    }).select("+password");
  }

  if (!user) {
    return next(new ErrorHandler("Invalid username/email or password.", 400));
  }

  if (!user.accountVerified) {
    return next(new ErrorHandler("Account not verified.", 400));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid credentials.", 400));
  }

  return sendToken(user, 200, "Login successful.", res);
});

// ==================== LOGOUT ====================
const logout = catchAsyncError(async (req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("token", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// ==================== PROFILE ====================
const getProfile = catchAsyncError(async (req, res, next) => {
  if (!req.user) {
    return next(new ErrorHandler("Not authenticated.", 401));
  }

  const user = await Owner.findOne({ username: req.user.username });
  if (!user) return next(new ErrorHandler("User not found.", 404));

  // Dynamic dish count
  const dishCount = await Dish.countDocuments({
    username: user.username,
  });

  // Average review rating
  const ratingAgg = await Review.aggregate([
    { $match: { username: user.username } },
    {
      $group: {
        _id: "$username",
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  const avgRating =
    ratingAgg.length > 0 ? Number(ratingAgg[0].avgRating.toFixed(1)) : null;

  // Response
  res.status(200).json({
    success: true,
    user,
    stats: {
      dishes: dishCount,
      rating: avgRating,
    },
  });
});

// ==================== UPDATE PROFILE ====================
const updateProfile = catchAsyncError(async (req, res, next) => {
  const user = await Owner.findOne({ username: req.user.username });
  if (!user) return next(new ErrorHandler("User not found.", 404));

  const fields = [
    "restaurantName",
    "ownerName",
    "phone",
    "state",
    "city",
    "pincode",
    "restaurantType",
    "description",
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  // 🔥 Handle profile photo
  if (req.files && req.files.profilePhoto) {
    const profileFile = req.files.profilePhoto[0];

    // Delete old profile photo if exists
    if (user.profilePhoto) {
      await deleteFromCloudflare(user.profilePhoto);
    }

    // Upload new profile photo
    const profileUrl = await uploadToCloudflare(
      profileFile.buffer,
      profileFile.originalname,
      profileFile.mimetype
    );

    user.profilePhoto = profileUrl;
  }

  // 🔥 Handle gallery images (max 3)
  if (req.files && req.files.galleryImages) {
    const galleryFiles = req.files.galleryImages;

    // Validate max 3 images
    const totalImages = (user.galleryImages?.length || 0) + galleryFiles.length;
    if (totalImages > 3) {
      return next(new ErrorHandler("Maximum 3 gallery images allowed", 400));
    }

    // Upload each gallery image
    for (const file of galleryFiles) {
      const imageUrl = await uploadToCloudflare(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      const key = imageUrl.replace(`${process.env.R2_PUBLIC_URL_R}/`, "");

      user.galleryImages.push({
        url: imageUrl,
        key: key,
        uploadedAt: new Date(),
      });
    }
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    user,
  });
});

// 🔥 NEW: DELETE GALLERY IMAGE
const deleteGalleryImage = catchAsyncError(async (req, res, next) => {
  const user = await Owner.findOne({ username: req.user.username });
  if (!user) return next(new ErrorHandler("User not found.", 404));

  const { imageId } = req.params;

  // Find image in gallery
  const imageIndex = user.galleryImages.findIndex(
    (img) => img._id.toString() === imageId
  );

  if (imageIndex === -1) {
    return next(new ErrorHandler("Image not found", 404));
  }

  const imageToDelete = user.galleryImages[imageIndex];

  // Delete from Cloudflare R2
  await deleteFromCloudflare(imageToDelete.url);

  // Remove from array
  user.galleryImages.splice(imageIndex, 1);

  await user.save();

  res.status(200).json({
    success: true,
    message: "Gallery image deleted successfully",
    user,
  });
});

 
 // 🔥 GET LANDING PAGE DATA (USER SIDE)
const getLandingPageData = catchAsyncError(async (req, res, next) => {
  const { username } = req.params;

  console.log("🔍 Fetching landing page for username:", username);

  const user = await Owner.findOne({ username }).select(
    "restaurantName ownerName profilePhoto galleryImages description restaurantType city state"
  );

  if (!user) {
    console.log("❌ Restaurant not found:", username);
    return next(new ErrorHandler("Restaurant not found", 404));
  }

  console.log("✅ Found restaurant:", user.restaurantName);
  console.log("📸 Gallery images count:", user.galleryImages?.length || 0);

  // Get stats
  const dishCount = await Dish.countDocuments({ username });

  const ratingAgg = await Review.aggregate([
    { $match: { username } },
    { $group: { _id: "$username", avgRating: { $avg: "$rating" } } },
  ]);

  const reviewCount = await Review.countDocuments({ username });

  const avgRating =
    ratingAgg.length > 0 ? Number(ratingAgg[0].avgRating.toFixed(1)) : null;

  const responseData = {
    success: true,
    restaurantName: user.restaurantName,
    ownerName: user.ownerName,
    profilePhoto: user.profilePhoto,
    galleryImages: user.galleryImages || [],
    description: user.description,
    restaurantType: user.restaurantType,
    city: user.city,
    state: user.state,
    rating: avgRating,
    reviewCount,
    dishCount,
    stats: {
      rating: avgRating,
      reviews: reviewCount,
      dishes: dishCount,
    },
  };

  console.log("📤 Sending response:", JSON.stringify(responseData, null, 2));

  res.status(200).json(responseData);
});
// ==================== FORGOT PASSWORD ====================
const sendForgotOTP = catchAsyncError(async (req, res, next) => {
  let { email } = req.body;
  email = normalizeEmail(email);

  if (!email?.trim()) return next(new ErrorHandler("Email required.", 400));

  const user = await Owner.findOne({ email });
  if (!user) return next(new ErrorHandler("User not found.", 404));

  const otp = user.generateResetOTP();
  await user.save({ validateBeforeSave: false });

  const emailHtml = `
    <p>Your password reset OTP is <strong>${otp}</strong>.</p>
    <p>It expires in 10 minutes.</p>
  `;

  await sendEmail({
    email: user.email,
    subject: "Password Reset OTP",
    html: emailHtml,
  });

  return res
    .status(200)
    .json({ success: true, message: "Reset OTP sent to email." });
});

// ==================== VERIFY FORGOT OTP ====================
const verifyForgotOTP = catchAsyncError(async (req, res, next) => {
  let { email, otp } = req.body;
  email = normalizeEmail(email);

  if (!email?.trim() || !otp?.trim())
    return next(new ErrorHandler("Email and OTP required.", 400));

  const user = await Owner.findOne({ email }).select(
    "+resetOTP +resetOTPExpire"
  );

  if (!user) return next(new ErrorHandler("User not found.", 404));

  if (!user.resetOTP || user.resetOTP.toString() !== otp.toString())
    return next(new ErrorHandler("Invalid OTP.", 400));

  if (Date.now() > new Date(user.resetOTPExpire).getTime())
    return next(new ErrorHandler("OTP expired.", 400));

  return res.status(200).json({ success: true, message: "OTP verified." });
});

// ==================== RESET PASSWORD ====================
const resetPassword = catchAsyncError(async (req, res, next) => {
  let { email, otp, password, confirmPassword } = req.body;
  email = normalizeEmail(email);

  if (
    !email?.trim() ||
    !otp?.trim() ||
    !password?.trim() ||
    !confirmPassword?.trim()
  )
    return next(new ErrorHandler("All fields required.", 400));

  if (password !== confirmPassword)
    return next(new ErrorHandler("Passwords do not match.", 400));

  const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password))
    return next(
      new ErrorHandler(
        "Password must contain upper, lower and number and be 8+ chars.",
        400
      )
    );

  const user = await Owner.findOne({ email }).select(
    "+resetOTP +resetOTPExpire +password"
  );

  if (!user) return next(new ErrorHandler("User not found.", 404));

  if (!user.resetOTP || user.resetOTP.toString() !== otp.toString())
    return next(new ErrorHandler("Invalid OTP.", 400));

  if (Date.now() > new Date(user.resetOTPExpire).getTime())
    return next(new ErrorHandler("OTP expired.", 400));

  user.password = password;
  user.resetOTP = undefined;
  user.resetOTPExpire = undefined;

  await user.save();

  return sendToken(user, 200, "Password reset successfully. Logged in.", res);
});

// ==================== EXPORT ====================
module.exports = {
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
};