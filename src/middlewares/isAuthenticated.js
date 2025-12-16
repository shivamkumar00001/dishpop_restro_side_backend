const jwt = require("jsonwebtoken");
const Owner = require("../models/Owner.model");
const ErrorHandler = require("../utils/ErrorHandler");

const isAuthenticated = async (req, res, next) => {
  try {
    // 1️⃣ Read token from cookie
    let token = req.cookies?.token;

    // 2️⃣ Fallback to Authorization header
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new ErrorHandler("Authentication required", 401));
    }

    // 3️⃣ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Support BOTH id & username tokens
    const user = await Owner.findOne({
      $or: [
        decoded.id ? { _id: decoded.id } : null,
        decoded.username ? { username: decoded.username } : null,
      ].filter(Boolean),
    }).select("-password");

    if (!user) {
      return next(new ErrorHandler("User not found", 401));
    }

    // 5️⃣ Attach user
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Error:", error.message);
    return next(new ErrorHandler("Invalid or expired token", 401));
  }
};

module.exports = isAuthenticated;
