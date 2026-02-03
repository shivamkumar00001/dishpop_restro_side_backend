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

//     // 🔥 NEW: Gallery images array (max 3)
//     galleryImages: {
//       type: [
//         {
//           url: { type: String, required: true },
//           key: { type: String, required: true },
//           uploadedAt: { type: Date, default: Date.now },
//         },
//       ],
//       default: [],
//       validate: {
//         validator: function (arr) {
//           return arr.length <= 3;
//         },
//         message: "Maximum 3 gallery images allowed",
//       },
//     },

//     state: String,
//     city: String,
//     pincode: String,
//     restaurantType: String,
//     description: String,

//     accountVerified: { type: Boolean, default: true },

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

//     // ==================== OTPs ====================
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

// // ==================== PRE-SAVE PASSWORD HASH ====================
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

// // ==================== JWT TOKEN (7 DAYS LOGIN) ====================
// ownerSchema.methods.getJWTToken = function () {
//   return jwt.sign(
//     {
//       id: this._id,
//       username: this.username,
//     },
//     process.env.JWT_SECRET,
//     {
//       expiresIn: "7d",
//     }
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

    // 🔥 Gallery images array (max 3)
    galleryImages: {
      type: [
        {
          url: { type: String, required: true },
          key: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
      validate: {
        validator: function (arr) {
          return arr.length <= 3;
        },
        message: "Maximum 3 gallery images allowed",
      },
    },

    // 🔥 NEW: Delivery phone numbers for order delivery
    deliveryPhones: {
      type: [
        {
          number: {
            type: String,
            required: true,
            trim: true,
            match: /^[0-9]{10}$/,
          },
          label: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
          },
          isPrimary: {
            type: Boolean,
            default: false,
          },
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    state: String,
    city: String,
    pincode: String,
    restaurantType: String,
    description: String,

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

// ==================== PRE-SAVE VALIDATION ====================
// Ensure only one primary phone exists
ownerSchema.pre("save", function (next) {
  if (this.deliveryPhones && this.deliveryPhones.length > 0) {
    const primaryPhones = this.deliveryPhones.filter((phone) => phone.isPrimary);
    
    if (primaryPhones.length > 1) {
      return next(new Error("Only one phone can be set as primary"));
    }
    
    // If no primary phone is set, make the first one primary
    if (primaryPhones.length === 0) {
      this.deliveryPhones[0].isPrimary = true;
    }
  }
  next();
});

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