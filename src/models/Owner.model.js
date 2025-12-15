// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");

// // ==================== SCHEMA ====================
// const ownerSchema = new mongoose.Schema(
//   {
//     username: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//       minlength: 3,
//       maxlength: 30,
//       match: /^[a-zA-Z0-9._]+$/,
//     },

//     restaurantName: { type: String, required: true, trim: true },
//     ownerName: { type: String, required: true, trim: true },

//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//     },

//     phone: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//     },

//     state: { type: String, trim: true },
//     city: { type: String, trim: true },
//     pincode: { type: String, trim: true },
//     restaurantType: { type: String, trim: true },
//     description: { type: String, trim: true }, // optional restaurant description
// photo: { type: String, trim: true },       // optional photo filename or URL


//     password: { type: String, required: true, select: false },

//     accountVerified: { type: Boolean, default: false },

//     // EMAIL VERIFICATION OTP
//     verificationCode: { type: String },
//     verificationCodeExpire: Date,

//     // FORGOT PASSWORD OTP
//     resetOTP: { type: String },
//     resetOTPExpire: Date,
//   },
//   { timestamps: true }
// );

// // ==================== PRE-SAVE HOOK ====================
// // Hash password if modified
// ownerSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   if (this.password.startsWith("$2b$")) return next();
//   this.password = await bcrypt.hash(this.password, 12);
//   next();
// });

// // ==================== METHODS ====================

// // Compare password
// ownerSchema.methods.comparePassword = async function (enteredPassword) {
//   return bcrypt.compare(enteredPassword, this.password);
// };

// // Generate email verification OTP
// ownerSchema.methods.generateVerificationCode = function () {
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   this.verificationCode = otp;
//   this.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
//   return otp;
// };

// // Generate forgot password OTP
// ownerSchema.methods.generateResetOTP = function () {
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   this.resetOTP = otp;
//   this.resetOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
//   return otp;
// };

// // Generate JWT token
// ownerSchema.methods.getJWTToken = function () {
//   return jwt.sign(
//     { username: this.username }, // include username in payload
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
//   );
// };

// // ==================== EXPORT MODEL ====================
// const Owner = mongoose.model("Owner", ownerSchema);
// module.exports = Owner;
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ==================== SCHEMA ====================
const ownerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-zA-Z0-9._]+$/,
      index: true
    },

    restaurantName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
      index: true,
      select: true
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[0-9]{10}$/,
      index: true
    },

    state: String,
    city: String,
    pincode: String,
    restaurantType: String,
    description: String,

    profilePhoto: { type: String, default: null },

    password: {
      type: String,
      required: true,
      select: false,
      minlength: 8
    },

    accountVerified: { type: Boolean, default: false },

    // EMAIL VERIFICATION OTP
    verificationCode: {
      type: String,
      select: false
    },

    verificationCodeExpire: {
      type: Date,
      select: false
    },

    // FORGOT PASSWORD OTP
    resetOTP: {
      type: String,
      select: false
    },

    resetOTPExpire: {
      type: Date,
      select: false
    },
  },
  { timestamps: true }
);

// ==================== INDEXES ====================
ownerSchema.index({ username: 1 });
ownerSchema.index({ email: 1 });
ownerSchema.index({ phone: 1 });

// ==================== PRE-SAVE HOOK ====================
ownerSchema.pre("save", async function (next) {
  // skip if password not modified
  if (!this.isModified("password")) {
    return next();
  }

  // bcrypt hash
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ==================== METHODS ====================

// Compare password
ownerSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Generate OTP for email verification
ownerSchema.methods.generateVerificationCode = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.verificationCode = otp;
  this.verificationCodeExpire = new Date(Date.now() + 10 * 60 * 1000);
  return otp;
};

// Generate OTP for forgot password
ownerSchema.methods.generateResetOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetOTP = otp;
  this.resetOTPExpire = new Date(Date.now() + 10 * 60 * 1000);
  return otp;
};

// Generate JWT token
ownerSchema.methods.getJWTToken = function () {
  return jwt.sign(
    {
      id: this._id,
      username: this.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ==================== EXPORT MODEL ====================
module.exports = mongoose.model("Owner", ownerSchema);
