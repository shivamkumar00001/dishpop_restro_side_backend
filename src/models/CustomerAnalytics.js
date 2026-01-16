const mongoose = require("mongoose");

/**
 * Customer Analytics Schema
 * Tracks customer visit history and purchase patterns
 */
const customerAnalyticsSchema = new mongoose.Schema(
  {
    /* ---------- RESTAURANT IDENTIFIER ---------- */
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    /* ---------- CUSTOMER DETAILS ---------- */
    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    /* ---------- VISIT TRACKING ---------- */
    firstVisit: {
      type: Date,
      default: Date.now,
    },

    lastVisit: {
      type: Date,
      default: Date.now,
    },

    totalVisits: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* ---------- PURCHASE TRACKING ---------- */
    totalPurchase: {
      type: Number,
      default: 0,
      min: 0,
    },

    averagePurchase: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* ---------- VISIT HISTORY ---------- */
    visitHistory: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        billNumber: String,
        amount: Number,
        tableNumber: Number,
      },
    ],

    /* ---------- CUSTOMER STATUS ---------- */
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "VIP"],
      default: "ACTIVE",
    },

    /* ---------- METADATA ---------- */
    tags: [String],
    notes: String,
  },
  {
    timestamps: true,
  }
);

/* ===============================
   INDEXES
================================ */
customerAnalyticsSchema.index(
  { username: 1, phoneNumber: 1 },
  { unique: true }
);
customerAnalyticsSchema.index({ username: 1, lastVisit: -1 });
customerAnalyticsSchema.index({ username: 1, totalPurchase: -1 });
customerAnalyticsSchema.index({ username: 1, totalVisits: -1 });

/* ===============================
   INSTANCE METHODS
================================ */

/**
 * Record a customer visit safely
 */
customerAnalyticsSchema.methods.recordVisit = function (
  billNumber,
  amount,
  tableNumber
) {
  const safeAmount = Number(amount) || 0;

  this.lastVisit = new Date();
  this.totalVisits += 1;
  this.totalPurchase += safeAmount;
  this.averagePurchase =
    this.totalVisits > 0
      ? this.totalPurchase / this.totalVisits
      : 0;

  this.visitHistory.push({
    date: new Date(),
    billNumber,
    amount: safeAmount,
    tableNumber,
  });

  // Auto-upgrade to VIP
  if (this.totalVisits >= 10 && this.status !== "VIP") {
    this.status = "VIP";
  }

  return this.save();
};

/**
 * Days since last visit
 */
customerAnalyticsSchema.methods.daysSinceLastVisit = function () {
  const diff = Date.now() - this.lastVisit.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

/**
 * Check inactivity
 */
customerAnalyticsSchema.methods.isInactive = function () {
  return this.daysSinceLastVisit() > 30;
};

/* ===============================
   STATIC METHODS
================================ */

/**
 * Find or create analytics record (SAFE)
 */
customerAnalyticsSchema.statics.findOrCreate = async function (
  username,
  customerName,
  phoneNumber
) {
  if (!username || !phoneNumber) {
    throw new Error("Username and phone number are required for analytics");
  }

  const normalizedUsername = username.toLowerCase().trim();
  const normalizedPhone = phoneNumber.trim();

  let customer = await this.findOne({
    username: normalizedUsername,
    phoneNumber: normalizedPhone,
  });

  if (!customer) {
    customer = await this.create({
      username: normalizedUsername,
      customerName,
      phoneNumber: normalizedPhone,
      firstVisit: new Date(),
      lastVisit: new Date(),
      totalVisits: 0,
      totalPurchase: 0,
      averagePurchase: 0,
      visitHistory: [],
      status: "ACTIVE",
    });
  }

  return customer;
};

/**
 * Get top customers by spending
 */
customerAnalyticsSchema.statics.getTopCustomers = function (
  username,
  limit = 10
) {
  return this.find({ username: username.toLowerCase() })
    .sort({ totalPurchase: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get repeat customers
 */
customerAnalyticsSchema.statics.getRepeatCustomers = function (username) {
  return this.find({
    username: username.toLowerCase(),
    totalVisits: { $gte: 2 },
  })
    .sort({ totalVisits: -1 })
    .lean();
};

/**
 * Get inactive customers
 */
customerAnalyticsSchema.statics.getInactiveCustomers = function (
  username,
  days = 30
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return this.find({
    username: username.toLowerCase(),
    lastVisit: { $lt: cutoff },
  })
    .sort({ lastVisit: 1 })
    .lean();
};

/**
 * Get analytics summary stats
 */
customerAnalyticsSchema.statics.getStats = async function (username) {
  const stats = await this.aggregate([
    { $match: { username: username.toLowerCase() } },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        totalRevenue: { $sum: "$totalPurchase" },
        avgPurchasePerCustomer: { $avg: "$totalPurchase" },
        avgVisitsPerCustomer: { $avg: "$totalVisits" },
        repeatCustomers: {
          $sum: { $cond: [{ $gte: ["$totalVisits", 2] }, 1, 0] },
        },
        vipCustomers: {
          $sum: { $cond: [{ $eq: ["$status", "VIP"] }, 1, 0] },
        },
      },
    },
  ]);

  return (
    stats[0] || {
      totalCustomers: 0,
      totalRevenue: 0,
      avgPurchasePerCustomer: 0,
      avgVisitsPerCustomer: 0,
      repeatCustomers: 0,
      vipCustomers: 0,
    }
  );
};

module.exports = mongoose.model(
  "CustomerAnalytics",
  customerAnalyticsSchema
);
