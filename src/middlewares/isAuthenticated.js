// const jwt = require("jsonwebtoken");
// const User = require("../models/Owner.model");
// const ErrorHandler = require("../utils/ErrorHandler");

// const isAuthenticated = async (req, res, next) => {
//   try {
//     const token =
//       req.cookies?.token ||
//       (req.headers.authorization?.startsWith("Bearer")
//         ? req.headers.authorization.split(" ")[1]
//         : null);

//     if (!token) {
//       return next(new ErrorHandler("Authentication required", 401));
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     const user = await User.findOne({ username: decoded.username }).select("-password");

//     if (!user) {
//       return next(new ErrorHandler("User not found", 404));
//     }

//     req.user = user;

//     next();
//   } catch (error) {
//     return next(new ErrorHandler("Invalid or expired token", 401));
//   }
// };

// module.exports = isAuthenticated;
// middlewares/isAuthenticated.js

const jwt = require("jsonwebtoken");
const Owner = require("../models/Owner.model");
const ErrorHandler = require("../utils/ErrorHandler");

const isAuthenticated = async (req, res, next) => {
  try {
    // 1️⃣ Get token from cookie first
    let token = req.cookies?.token;

    // 2️⃣ Fallback: Authorization header ("Bearer token")
    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 3️⃣ If no token → unauthorized
    if (!token) {
      return next(new ErrorHandler("Authentication required", 401));
    }

    // 4️⃣ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5️⃣ Find owner by username or ID (support both)
    const user = await Owner.findOne({
      username: decoded.username,
    }).select("-password");

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // 6️⃣ Attach user to request
    req.user = user;

    next();
  } catch (error) {
    console.error("Auth Error:", error.message);
    return next(new ErrorHandler("Invalid or expired token", 401));
  }
};

module.exports = isAuthenticated;
