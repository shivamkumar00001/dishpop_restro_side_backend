// const mongoose = require("mongoose");

// const billingConfigSchema = new mongoose.Schema(
//   {
//     owner: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Owner",
//       required: true,
//       unique: true, // one billing config per restaurant
//     },

//     /* ---------- LEGAL DETAILS ---------- */
//     legalName: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     panNumber: {
//       type: String,
//       required: true,
//       uppercase: true,
//       trim: true,
//       match: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
//     },

//     gstNumber: {
//       type: String,
//       required: function () {
//         return this.taxType !== "NO_GST";
//       },
//       uppercase: true,
//       trim: true,
//       match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
//     },

//     /* ---------- ADDRESS ---------- */
//     address: {
//       type: String,
//       required: true,
//     },

//     state: {
//       type: String,
//       required: true,
//     },

//     pincode: {
//       type: String,
//       required: true,
//     },

//     /* ---------- TAX CONFIG ---------- */
//     taxType: {
//       type: String,
//       enum: ["CGST_SGST", "IGST", "NO_GST", "INCLUSIVE_GST"],
//       required: true,
//     },

//     /* 🔥 KEY ADDITION: FLEXIBLE TAX RATE */
//     taxRate: {
//       type: Number, // percentage (e.g. 2.5, 5, 12, 18)
//       required: function () {
//         return this.taxType !== "NO_GST";
//       },
//       min: 0,
//       max: 28, // safe upper limit for GST slabs
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("BillingConfig", billingConfigSchema);
const mongoose = require("mongoose");

const billingConfigSchema = new mongoose.Schema(
  {
    /* ---------- OWNER (USERNAME BASED) ---------- */
    username: {
      type: String,
      required: true,
      unique: true, // one billing config per restaurant
      lowercase: true,
      trim: true,
      index: true,
    },

    /* ---------- LEGAL DETAILS ---------- */
    legalName: {
      type: String,
      required: true,
      trim: true,
    },

    panNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
    },

    gstNumber: {
      type: String,
      required: function () {
        return this.taxType !== "NO_GST";
      },
      uppercase: true,
      trim: true,
      match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
    },

    /* ---------- ADDRESS ---------- */
    address: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },

    pincode: {
      type: String,
      required: true,
    },

    /* ---------- TAX CONFIG ---------- */
    taxType: {
      type: String,
      enum: ["CGST_SGST", "IGST", "NO_GST", "INCLUSIVE_GST"],
      required: true,
    },

    taxRate: {
      type: Number,
      required: function () {
        return this.taxType !== "NO_GST";
      },
      min: 0,
      max: 28,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BillingConfig", billingConfigSchema);