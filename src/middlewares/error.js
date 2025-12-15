const ErrorHandler = require("../utils/ErrorHandler");

const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal server error";

  // Mongoose invalid ObjectId
  if (err.name === "CastError") {
    err = new ErrorHandler(`Invalid ${err.path}`, 400);
  }

  // Invalid JWT
  if (err.name === "JsonWebTokenError") {
    err = new ErrorHandler("JWT is invalid", 401);
  }

  // JWT expired
  if (err.name === "TokenExpiredError") {
    err = new ErrorHandler("JWT expired", 401);
  }

  // Duplicate key
  if (err.code === 11000) {
    err = new ErrorHandler(
      `Duplicate field value entered: ${Object.keys(err.keyValue)}`,
      400
    );
  }

  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
    field: err.field || null,
  });
};

module.exports = errorMiddleware;
