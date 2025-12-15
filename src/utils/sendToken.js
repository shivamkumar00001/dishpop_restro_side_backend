// const sendToken = (user, statusCode, message, res) => {
//   const token = user.getJWTToken();

//   const cookieExpireDays = Number(process.env.COOKIE_EXPIRE) || 7;

//   const options = {
//     expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
//     httpOnly: true,
//     secure: false, // Localhost
//     sameSite: "lax",
//   };

//   res.status(statusCode)
//     .cookie("token", token, options)
//     .json({
//       success: true,
//       message,
//       user: {
//         username: user.username,
//         restaurantName: user.restaurantName,
//         ownerName: user.ownerName,
//         email: user.email,
//         phone: user.phone,
//       },
//     });
// };

// module.exports = sendToken;
const sendToken = (user, statusCode, message, res) => {
  const token = user.getJWTToken();

  const cookieExpireDays = Number(process.env.COOKIE_EXPIRE) || 7;

  const options = {
    expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: false, // Localhost
    sameSite: "lax",
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      message,
      user: {
        username: user.username,
        restaurantName: user.restaurantName,
        name: user.ownerName,   // 👈 FIXED FIELD
        email: user.email,
        phone: user.phone,
      },
    });
};

module.exports = sendToken;
