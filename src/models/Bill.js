const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/* ===============================
   BILL ITEM SCHEMA
================================ */
const BillItemSchema = new Schema(
  {
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    imageUrl: String,
    qty: { type: Number, required: true, min: 1 },
    variant: {
      name: String,
      price: Number,
    },
    addons: [
      {
        id: String,
        name: String,
        price: Number,
      },
    ],
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    sourceOrderId: { type: Schema.Types.ObjectId, ref: "Customer" },
  },
  { _id: false }
);

/* ===============================
   AUDIT LOG SCHEMA
================================ */
const AuditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "BILL_CREATED",
        "ITEM_ADDED",
        "ITEM_REMOVED",
        "QTY_UPDATED",
        "BILL_MERGED",
        "TABLE_MERGED",
        "CUSTOMER_UPDATED",
        "DISCOUNT_APPLIED",
        "TAX_UPDATED",
        "SERVICE_CHARGE_UPDATED",
        "BILL_FINALIZED",
        "BILL_CANCELLED",
        "PAYMENT_RECEIVED",
      ],
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
    },
    details: Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ===============================
   MAIN BILL SCHEMA
================================ */
const BillSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      index: true,
    },
    billNumber: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    tableNumber: {
      type: Number,
      required: true,
      index: true,
    },
    mergedTables: [Number],
    customerName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    items: {
      type: [BillItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Bill must have at least one item",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED", "NONE"],
      default: "NONE",
    },
    taxes: [
      {
        name: { type: String, required: true },
        rate: { type: Number, required: true, min: 0, max: 100 },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    totalTax: {
      type: Number,
      default: 0,
      min: 0,
    },
    serviceCharge: {
      enabled: { type: Boolean, default: false },
      rate: { type: Number, default: 0, min: 0, max: 100 },
      amount: { type: Number, default: 0, min: 0 },
    },
    additionalCharges: [
      {
        name: String,
        amount: Number,
      },
    ],
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    roundingAdjustment: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "PARTIAL", "CANCELLED"],
      default: "PENDING",
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "CARD", "UPI", "MIXED", null],
      default: null,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["DRAFT", "FINALIZED", "CANCELLED"],
      default: "DRAFT",
    },
    sourceOrders: [
      {
        type: Schema.Types.ObjectId,
        ref: "Customer",
      },
    ],
    mergedFromBills: [
      {
        billId: Schema.Types.ObjectId,
        billNumber: String,
        mergedAt: Date,
      },
    ],
    notes: String,
    specialInstructions: String,
    finalizedAt: Date,
    cancelledAt: Date,
    auditLog: [AuditLogSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* INDEXES */
BillSchema.index({ username: 1, billNumber: 1 }, { unique: true });
BillSchema.index({ username: 1, sessionId: 1 });
BillSchema.index({ username: 1, tableNumber: 1 });
BillSchema.index({ username: 1, phoneNumber: 1 });
BillSchema.index({ username: 1, status: 1 });
BillSchema.index({ createdAt: -1 });

/* PRE-SAVE HOOK */
BillSchema.pre("save", function (next) {
  if (this.isModified("items") || this.isNew) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);

    let discountAmount = 0;
    if (this.discountType === "PERCENTAGE") {
      discountAmount = (this.subtotal * this.discount) / 100;
    } else if (this.discountType === "FIXED") {
      discountAmount = this.discount;
    }

    const amountAfterDiscount = this.subtotal - discountAmount;

    let serviceChargeAmount = 0;
    if (this.serviceCharge.enabled) {
      serviceChargeAmount = (amountAfterDiscount * this.serviceCharge.rate) / 100;
      this.serviceCharge.amount = serviceChargeAmount;
    }

    const taxableAmount = amountAfterDiscount + serviceChargeAmount;

    let totalTaxAmount = 0;
    if (this.taxes && this.taxes.length > 0) {
      this.taxes.forEach((tax) => {
        tax.amount = (taxableAmount * tax.rate) / 100;
        totalTaxAmount += tax.amount;
      });
    }
    this.totalTax = totalTaxAmount;

    const additionalChargesTotal = this.additionalCharges.reduce(
      (sum, charge) => sum + (charge.amount || 0),
      0
    );

    let grandTotal = taxableAmount + totalTaxAmount + additionalChargesTotal;

    const roundedTotal = Math.round(grandTotal);
    this.roundingAdjustment = roundedTotal - grandTotal;
    this.grandTotal = roundedTotal;
  }
  next();
});

/* METHODS */
BillSchema.methods.addAuditLog = function (action, performedBy, details = {}) {
  this.auditLog.push({
    action,
    performedBy,
    details,
    timestamp: new Date(),
  });
};

BillSchema.methods.finalize = async function (performedBy) {
  if (this.status === "FINALIZED") {
    throw new Error("Bill is already finalized");
  }
  this.status = "FINALIZED";
  this.finalizedAt = new Date();
  this.addAuditLog("BILL_FINALIZED", performedBy);
  await this.save();
  return this;
};

BillSchema.methods.cancel = async function (performedBy, reason) {
  if (this.status === "FINALIZED") {
    throw new Error("Cannot cancel a finalized bill");
  }
  this.status = "CANCELLED";
  this.cancelledAt = new Date();
  this.addAuditLog("BILL_CANCELLED", performedBy, { reason });
  await this.save();
  return this;
};

/* STATIC METHODS */
BillSchema.statics.generateBillNumber = async function (username) {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
  const prefix = `B${year}${month}${day}`;

  const lastBill = await this.findOne({
    username,
    billNumber: { $regex: `^${prefix}` },
  })
    .sort({ billNumber: -1 })
    .limit(1);

  let sequence = 1;
  if (lastBill) {
    const lastSequence = parseInt(lastBill.billNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, "0")}`;
};

BillSchema.statics.getBySession = async function (username, sessionId) {
  return this.find({
    username,
    sessionId,
    status: { $ne: "CANCELLED" },
  }).sort({ createdAt: -1 });
};

BillSchema.statics.getActiveByTable = async function (username, tableNumber) {
  return this.find({
    username,
    tableNumber,
    status: "DRAFT",
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model("Bill", BillSchema);
