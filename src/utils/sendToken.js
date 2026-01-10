// // // const sendToken = (user, statusCode, message, res) => {
// // //   const token = user.getJWTToken();

// // //   const cookieExpireDays = Number(process.env.COOKIE_EXPIRE) || 7;
// // //   const isProd = process.env.NODE_ENV === "production";

// // //   res
// // //     .status(statusCode)
// // //     .cookie("token", token, {
// // //       expires: new Date(
// // //         Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000
// // //       ),
// // //       httpOnly: true,

// // //       // 🔥 REQUIRED FOR iOS SAFARI
// // //       secure: isProd,                     // must be true on HTTPS
// // //       sameSite: isProd ? "none" : "lax",  // cross-site allowed

// // //       // 🔥 THIS IS THE FIX
// // //       domain: isProd ? ".dishpop.in" : undefined,
// // //     })
// // //     .json({
// // //       success: true,
// // //       message,
// // //       user: {
// // //         username: user.username,
// // //         restaurantName: user.restaurantName,
// // //         name: user.ownerName,
// // //         email: user.email,
// // //         phone: user.phone,
// // //       },
// // //     });
// // // };

// // // module.exports = sendToken;
// // const sendToken = async (user, statusCode, message, res) => {
// //   const accessToken = user.getAccessToken();
// //   const refreshToken = user.getRefreshToken();

// //   const isProd = process.env.NODE_ENV === "production";

// //   // save refresh token in DB
// //   user.refreshToken = refreshToken;
// //   user.refreshTokenExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
// //   await user.save({ validateBeforeSave: false });

// //   // access token (short)
// //   res.cookie("token", accessToken, {
// //     httpOnly: true,
// //     secure: isProd,
// //     sameSite: isProd ? "none" : "lax",
// //     domain: isProd ? ".dishpop.in" : undefined,
// //     maxAge: 15 * 60 * 1000,
// //   });

// //   // refresh token (7 days)
// //   res.cookie("refreshToken", refreshToken, {
// //     httpOnly: true,
// //     secure: isProd,
// //     sameSite: isProd ? "none" : "lax",
// //     domain: isProd ? ".dishpop.in" : undefined,
// //     maxAge: 7 * 24 * 60 * 60 * 1000,
// //   });

// //   res.status(statusCode).json({
// //     success: true,
// //     message,
// //     accessToken, // 🔥 frontend fallback
// //     user: {
// //       username: user.username,
// //       restaurantName: user.restaurantName,
// //       email: user.email,
// //     },
// //   });
// // };

// // module.exports = sendToken;
// const sendToken = async (user, statusCode, message, res) => {
//   // 1️⃣ Generate tokens from model
//   const accessToken = user.getAccessToken();
//   const refreshToken = user.getRefreshToken();

//   const isProd = process.env.NODE_ENV === "production";

//   // 2️⃣ Save refresh token in DB (for validation & rotation)
//   user.refreshToken = refreshToken;
//   user.refreshTokenExpire = new Date(
//     Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
//   );
//   await user.save({ validateBeforeSave: false });

//   // 3️⃣ Access token cookie (short-lived)
//   res.cookie("token", accessToken, {
//     httpOnly: true,
//     secure: isProd,
//     sameSite: isProd ? "none" : "lax",
//     domain: isProd ? ".dishpop.in" : undefined,
//     maxAge: 15 * 60 * 1000, // 15 minutes
//   });

//   // 4️⃣ Refresh token cookie (long-lived)
//   res.cookie("refreshToken", refreshToken, {
//     httpOnly: true,
//     secure: isProd,
//     sameSite: isProd ? "none" : "lax",
//     domain: isProd ? ".dishpop.in" : undefined,
//     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//   });

//   // 5️⃣ Response (NO TOKENS SENT TO FRONTEND)
//   res.status(statusCode).json({
//     success: true,
//     message,
//     user: {
//       username: user.username,
//       restaurantName: user.restaurantName,
//       email: user.email,
//     },
//   });
// };

// module.exports = sendToken;
const sendToken = async (user, statusCode, message, res) => {
  const accessToken = user.getAccessToken();
  const refreshToken = user.getRefreshToken();

  const isProd = process.env.NODE_ENV === "production";

  user.refreshToken = refreshToken;
  user.refreshTokenExpire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  // Access token cookie (15 minutes)
  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: isProd,  // ✅ Will be true in production
    sameSite: isProd ? "none" : "lax",  // ✅ "none" for cross-site in production
    // ❌ REMOVE THIS LINE:
    // domain: isProd ? ".dishpop.in" : undefined,
    maxAge: 15 * 60 * 1000,
  });

  // Refresh token cookie (7 days)
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    // ❌ REMOVE THIS LINE:
    // domain: isProd ? ".dishpop.in" : undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(statusCode).json({
    success: true,
    message,
    user: {
      username: user.username,
      restaurantName: user.restaurantName,
      email: user.email,
    },
  });
};

module.exports = sendToken;