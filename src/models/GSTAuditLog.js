const mongoose = require("mongoose");

const GSTAuditLogSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      index: true,
    },

    /* ---------- TRANSACTION REFERENCE ---------- */
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      required: true,
    },
    billNumber: {
      type: String,
      required: true,
      index: true,
    },

    /* ---------- CUSTOMER DETAILS ---------- */
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
    },

    /* ---------- BILLING AMOUNTS ---------- */
    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED", "NONE"],
      default: "NONE",
    },
    taxableAmount: {
      type: Number,
      required: true,
    },

    /* ---------- GST BREAKDOWN ---------- */
    gstType: {
      type: String,
      enum: ["CGST_SGST", "IGST", "NO_GST", "INCLUSIVE_GST"],
      required: true,
    },
    gstRate: {
      type: Number,
      default: 0,
    },
    cgstAmount: {
      type: Number,
      default: 0,
    },
    sgstAmount: {
      type: Number,
      default: 0,
    },
    igstAmount: {
      type: Number,
      default: 0,
    },
    totalGST: {
      type: Number,
      required: true,
    },

    /* ---------- SERVICE CHARGE ---------- */
    serviceChargeAmount: {
      type: Number,
      default: 0,
    },

    /* ---------- FINAL AMOUNT ---------- */
    grandTotal: {
      type: Number,
      required: true,
    },
    roundingAdjustment: {
      type: Number,
      default: 0,
    },

    /* ---------- PAYMENT INFO ---------- */
    paymentMethod: {
      type: String,
      enum: ["CASH", "CARD", "UPI", "MIXED"],
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "PARTIAL", "CANCELLED"],
      default: "PENDING",
    },

    /* ---------- TABLE & SESSION ---------- */
    tableNumber: {
      type: Number,
      required: true,
    },
    sessionId: {
      type: String,
    },

    /* ---------- BUSINESS INFO (from BillingConfig) ---------- */
    businessGSTNumber: String,
    businessPAN: String,
    businessLegalName: String,

    /* ---------- STATUS ---------- */
    status: {
      type: String,
      enum: ["DRAFT", "FINALIZED", "CANCELLED"],
      default: "FINALIZED",
    },

    /* ---------- TIMESTAMPS ---------- */
    billedAt: {
      type: Date,
      required: true,
    },
    finalizedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },

    /* ---------- AUDIT INFO ---------- */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* ---------- INDEXES ---------- */
GSTAuditLogSchema.index({ username: 1, billedAt: -1 });
GSTAuditLogSchema.index({ username: 1, gstType: 1 });
GSTAuditLogSchema.index({ username: 1, status: 1 });
GSTAuditLogSchema.index({ billNumber: 1 });
GSTAuditLogSchema.index({ createdAt: -1 });

/* ---------- STATIC METHODS ---------- */

/**
 * Get GST summary for a date range
 */
GSTAuditLogSchema.statics.getGSTSummary = async function (
  username,
  startDate,
  endDate
) {
  return this.aggregate([
    {
      $match: {
        username,
        status: "FINALIZED",
        billedAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: "$gstType",
        totalBills: { $sum: 1 },
        totalSales: { $sum: "$grandTotal" },
        totalTaxableAmount: { $sum: "$taxableAmount" },
        totalCGST: { $sum: "$cgstAmount" },
        totalSGST: { $sum: "$sgstAmount" },
        totalIGST: { $sum: "$igstAmount" },
        totalGST: { $sum: "$totalGST" },
      },
    },
  ]);
};

/**
 * Get monthly GST report
 */
GSTAuditLogSchema.statics.getMonthlyReport = async function (
  username,
  year,
  month
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  return this.aggregate([
    {
      $match: {
        username,
        status: "FINALIZED",
        billedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          day: { $dayOfMonth: "$billedAt" },
          gstType: "$gstType",
        },
        totalBills: { $sum: 1 },
        totalSales: { $sum: "$grandTotal" },
        totalGST: { $sum: "$totalGST" },
        totalCGST: { $sum: "$cgstAmount" },
        totalSGST: { $sum: "$sgstAmount" },
        totalIGST: { $sum: "$igstAmount" },
      },
    },
    {
      $sort: { "_id.day": 1 },
    },
  ]);
};

/**
 * Get tax rate wise breakdown
 */
GSTAuditLogSchema.statics.getTaxRateBreakdown = async function (
  username,
  startDate,
  endDate
) {
  return this.aggregate([
    {
      $match: {
        username,
        status: "FINALIZED",
        billedAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      },
    },
    {
      $group: {
        _id: "$gstRate",
        totalBills: { $sum: 1 },
        totalTaxableAmount: { $sum: "$taxableAmount" },
        totalGST: { $sum: "$totalGST" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

module.exports = mongoose.model("GSTAuditLog", GSTAuditLogSchema);