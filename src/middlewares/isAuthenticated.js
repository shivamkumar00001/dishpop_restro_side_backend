// const jwt = require("jsonwebtoken");
// const Owner = require("../models/Owner");
// const ErrorHandler = require("../utils/ErrorHandler");

// const isAuthenticated = async (req, res, next) => {
//   try {
//     // 1️⃣ Read token from cookie
//     let token = req.cookies?.token;

//     // 2️⃣ Fallback to Authorization header (optional)
//     if (!token && req.headers.authorization?.startsWith("Bearer ")) {
//       token = req.headers.authorization.split(" ")[1];
//     }

//     if (!token) {
//       return next(new ErrorHandler("Authentication required", 401));
//     }

//     // 3️⃣ Verify JWT
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // 4️⃣ Fetch user (deterministic)
//     let user;
//     if (decoded.id) {
//       user = await Owner.findById(decoded.id).select("-password");
//     } else if (decoded.username) {
//       user = await Owner.findOne({ username: decoded.username }).select("-password");
//     }

//     if (!user) {
//       return next(new ErrorHandler("User not found", 401));
//     }

//     // 5️⃣ Attach user to request
//     req.user = user;
//     next();
//   } catch (error) {
//     console.error("Auth Error:", error.message);

//     if (error.name === "TokenExpiredError") {
//       return next(
//         new ErrorHandler("Session expired. Please login again.", 401)
//       );
//     }

//     return next(new ErrorHandler("Invalid token", 401));
//   }
// };

// module.exports = isAuthenticated;
const jwt = require("jsonwebtoken");
const Owner = require("../models/Owner");
const ErrorHandler = require("../utils/ErrorHandler");

const isAuthenticated = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new ErrorHandler("Authentication required", 401));
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await Owner.findById(decoded.id).select("-password");

    if (!user) {
      return next(new ErrorHandler("User not found", 401));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new ErrorHandler("Session expired", 401));
    }
    return next(new ErrorHandler("Invalid token", 401));
  }
};

module.exports = isAuthenticated;
