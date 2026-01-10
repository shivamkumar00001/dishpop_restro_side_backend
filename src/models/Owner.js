// // const mongoose = require("mongoose");
// // const bcrypt = require("bcryptjs");
// // const jwt = require("jsonwebtoken");

// // // ==================== SCHEMA ====================
// // const ownerSchema = new mongoose.Schema(
// //   {
// //     username: {
// //       type: String,
// //       required: true,
// //       unique: true,
// //       lowercase: true,
// //       trim: true,
// //       minlength: 3,
// //       maxlength: 30,
// //       match: /^[a-zA-Z0-9._]+$/,
// //       index: true
// //     },

// //     restaurantName: {
// //       type: String,
// //       required: true,
// //       trim: true,
// //     },

// //     ownerName: {
// //       type: String,
// //       required: true,
// //       trim: true,
// //     },

// //     email: {
// //       type: String,
// //       required: true,
// //       unique: true,
// //       lowercase: true,
// //       trim: true,
// //       match: /^\S+@\S+\.\S+$/,
// //       index: true,
// //       select: true
// //     },
// // refreshToken: {
// //   type: String,
// //   select: false,
// // },
// // refreshTokenExpire: {
// //   type: Date,
// //   select: false,
// // },

// //     phone: {
// //       type: String,
// //       required: true,
// //       unique: true,
// //       trim: true,
// //       match: /^[0-9]{10}$/,
// //       index: true
// //     },

// //     state: String,
// //     city: String,
// //     pincode: String,
// //     restaurantType: String,
// //     description: String,

// //     profilePhoto: { type: String, default: null },

// //     password: {
// //       type: String,
// //       required: true,
// //       select: false,
// //       minlength: 8
// //     },

// //     accountVerified: { type: Boolean, default: false },

// //     // ==================== SUBSCRIPTION ====================
// // subscription: {
// //   status: {
// //     type: String,
// //     enum: [
// //       "NOT_SUBSCRIBED",
// //       "PENDING_AUTH",   // 🔥 ADD THIS
// //       "TRIALING",
// //       "ACTIVE",
// //       "CANCELLED",
// //       "EXPIRED"
// //     ],
// //     default: "NOT_SUBSCRIBED"
// //   },

// //   plan: {
// //     type: String,
// //     enum: ["MONTHLY", "QUARTERLY", "YEARLY",null],
// //     default: null
// //   },

// //   razorpayCustomerId: String,
// //   razorpaySubscriptionId: String,

// //   trialStart: Date,
// //   trialEnd: Date,

// //   subscribedAt: Date,
// //   currentPeriodEnd: Date
// // }
// // ,

// //     // EMAIL VERIFICATION OTP
// //     verificationCode: { type: String, select: false },
// //     verificationCodeExpire: { type: Date, select: false },

// //     // FORGOT PASSWORD OTP
// //     resetOTP: { type: String, select: false },
// //     resetOTPExpire: { type: Date, select: false },
// //   },
// //   { timestamps: true }
// // );

// // // ==================== INDEXES ====================
// // ownerSchema.index({ username: 1 });
// // ownerSchema.index({ email: 1 });
// // ownerSchema.index({ phone: 1 });

// // // ==================== PRE-SAVE HOOK ====================
// // ownerSchema.pre("save", async function (next) {
// //   if (!this.isModified("password")) return next();

// //   const salt = await bcrypt.genSalt(12);
// //   this.password = await bcrypt.hash(this.password, salt);
// //   next();
// // });

// // // ==================== METHODS ====================

// // // Compare password
// // ownerSchema.methods.comparePassword = async function (enteredPassword) {
// //   return bcrypt.compare(enteredPassword, this.password);
// // };

// // // Generate OTP for email verification
// // ownerSchema.methods.generateVerificationCode = function () {
// //   const otp = Math.floor(100000 + Math.random() * 900000).toString();
// //   this.verificationCode = otp;
// //   this.verificationCodeExpire = new Date(Date.now() + 10 * 60 * 1000);
// //   return otp;
// // };

// // // Generate OTP for forgot password
// // ownerSchema.methods.generateResetOTP = function () {
// //   const otp = Math.floor(100000 + Math.random() * 900000).toString();
// //   this.resetOTP = otp;
// //   this.resetOTPExpire = new Date(Date.now() + 10 * 60 * 1000);
// //   return otp;
// // };

// // // Generate JWT token
// // ownerSchema.methods.getJWTToken = function () {
// //   return jwt.sign(
// //     { id: this._id, username: this.username },
// //     process.env.JWT_SECRET,
// //     { expiresIn: "7d" }
// //   );
// // };

// // // ==================== EXPORT MODEL ====================
// // module.exports = mongoose.model("Owner", ownerSchema);
// // ownerSchema.methods.getAccessToken = function () {
// //   return jwt.sign(
// //     { id: this._id, username: this.username },
// //     process.env.JWT_SECRET,
// //     { expiresIn: "15m" }
// //   );
// // };

// // ownerSchema.methods.getRefreshToken = function () {
// //   return jwt.sign(
// //     { id: this._id },
// //     process.env.REFRESH_SECRET,
// //     { expiresIn: "7d" }
// //   );
// // };
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
//       index: true,
//     },

//     restaurantName: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     ownerName: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//       match: /^\S+@\S+\.\S+$/,
//       index: true,
//     },

//     phone: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//       match: /^[0-9]{10}$/,
//       index: true,
//     },

//     password: {
//       type: String,
//       required: true,
//       select: false,
//       minlength: 8,
//     },

//     profilePhoto: { type: String, default: null },

//     accountVerified: { type: Boolean, default: false },

//     // ==================== TOKENS ====================
    

//     // ==================== SUBSCRIPTION ====================
//     subscription: {
//       status: {
//         type: String,
//         enum: [
//           "NOT_SUBSCRIBED",
//           "PENDING_AUTH",
//           "TRIALING",
//           "ACTIVE",
//           "CANCELLED",
//           "EXPIRED",
//         ],
//         default: "NOT_SUBSCRIBED",
//       },
//       plan: {
//         type: String,
//         enum: ["MONTHLY", "QUARTERLY", "YEARLY", null],
//         default: null,
//       },
//       razorpayCustomerId: String,
//       razorpaySubscriptionId: String,
//       trialStart: Date,
//       trialEnd: Date,
//       subscribedAt: Date,
//       currentPeriodEnd: Date,
//     },

//     // OTPs
//     verificationCode: { type: String, select: false },
//     verificationCodeExpire: { type: Date, select: false },
//     resetOTP: { type: String, select: false },
//     resetOTPExpire: { type: Date, select: false },
//   },
//   { timestamps: true }
// );

// // ==================== INDEXES ====================
// ownerSchema.index({ username: 1 });
// ownerSchema.index({ email: 1 });
// ownerSchema.index({ phone: 1 });

// // ==================== PRE-SAVE ====================
// ownerSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   const salt = await bcrypt.genSalt(12);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// // ==================== METHODS ====================

// // Compare password
// ownerSchema.methods.comparePassword = async function (enteredPassword) {
//   return bcrypt.compare(enteredPassword, this.password);
// };

// // Email verification OTP
// ownerSchema.methods.generateVerificationCode = function () {
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   this.verificationCode = otp;
//   this.verificationCodeExpire = new Date(Date.now() + 10 * 60 * 1000);
//   return otp;
// };

// // Forgot password OTP
// ownerSchema.methods.generateResetOTP = function () {
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   this.resetOTP = otp;
//   this.resetOTPExpire = new Date(Date.now() + 10 * 60 * 1000);
//   return otp;
// };

// // 🔐 ACCESS TOKEN (15 min)
// ownerSchema.methods.getAccessToken = function () {
//   return jwt.sign(
//     { id: this._id, username: this.username },
//     process.env.ACCESS_TOKEN_SECRET,
//     { expiresIn: "15m" }
//   );
// };

// // 🔁 REFRESH TOKEN (7 days)
// ownerSchema.methods.getRefreshToken = function () {
//   return jwt.sign(
//     { id: this._id },
//     process.env.REFRESH_SECRET,
//     { expiresIn: "7d" }
//   );
// };

// // ==================== EXPORT ====================
// module.exports = mongoose.model("Owner", ownerSchema);
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
      index: true,
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
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[0-9]{10}$/,
      index: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
      minlength: 8,
    },

    profilePhoto: { type: String, default: null },

    accountVerified: { type: Boolean, default: true },

    // ==================== SUBSCRIPTION ====================
    subscription: {
      status: {
        type: String,
        enum: [
          "NOT_SUBSCRIBED",
          "PENDING_AUTH",
          "TRIALING",
          "ACTIVE",
          "CANCELLED",
          "EXPIRED",
        ],
        default: "NOT_SUBSCRIBED",
      },
      plan: {
        type: String,
        enum: ["MONTHLY", "QUARTERLY", "YEARLY", null],
        default: null,
      },
      razorpayCustomerId: String,
      razorpaySubscriptionId: String,
      trialStart: Date,
      trialEnd: Date,
      subscribedAt: Date,
      currentPeriodEnd: Date,
    },

    // ==================== OTPs ====================
    verificationCode: { type: String, select: false },
    verificationCodeExpire: { type: Date, select: false },
    resetOTP: { type: String, select: false },
    resetOTPExpire: { type: Date, select: false },
  },
  { timestamps: true }
);

// ==================== INDEXES ====================
ownerSchema.index({ username: 1 });
ownerSchema.index({ email: 1 });
ownerSchema.index({ phone: 1 });

// ==================== PRE-SAVE PASSWORD HASH ====================
ownerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ==================== METHODS ====================

// Compare password
ownerSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Email verification OTP
ownerSchema.methods.generateVerificationCode = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.verificationCode = otp;
  this.verificationCodeExpire = new Date(Date.now() + 10 * 60 * 1000);
  return otp;
};

// Forgot password OTP
ownerSchema.methods.generateResetOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetOTP = otp;
  this.resetOTPExpire = new Date(Date.now() + 10 * 60 * 1000);
  return otp;
};

// ==================== JWT TOKEN (7 DAYS LOGIN) ====================
ownerSchema.methods.getJWTToken = function () {
  return jwt.sign(
    {
      id: this._id,
      username: this.username,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// ==================== EXPORT ====================
module.exports = mongoose.model("Owner", ownerSchema);
