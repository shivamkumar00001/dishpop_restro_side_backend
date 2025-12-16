const sendToken = (user, statusCode, message, res) => {
  const token = user.getJWTToken();

  const cookieExpireDays = Number(process.env.COOKIE_EXPIRE) || 7;
  const isProd = process.env.NODE_ENV === "production";

  res
    .status(statusCode)
    .cookie("token", token, {
      expires: new Date(
        Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: isProd,                 // ✅ true in production
      sameSite: isProd ? "none" : "lax", // ✅ required for cross-site
    })
    .json({
      success: true,
      message,
      user: {
        username: user.username,
        restaurantName: user.restaurantName,
        name: user.ownerName,
        email: user.email,
        phone: user.phone,
      },
    });
};

module.exports = sendToken;
