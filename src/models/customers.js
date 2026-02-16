// const mongoose = require("mongoose");

// const Schema = mongoose.Schema;

// /* ---------- Addons ---------- */
// const AddonSchema = new Schema(
//   {
//     id: String,
//     name: String,
//     price: Number,
//   },
//   { _id: false }
// );

// /* ---------- Variants ---------- */
// const VariantSchema = new Schema(
//   {
//     name: { type: String, required: true },
//     price: { type: Number, required: true },
//   },
//   { _id: false }
// );

// /* ---------- Items ---------- */
// const ItemSchema = new Schema(
//   {
//     itemId: { type: String, required: true },
//     name: { type: String, required: true },
//     imageUrl: String,

//     qty: { type: Number, required: true },

//     variant: { type: VariantSchema, required: true },

//     addons: { type: [AddonSchema], default: [] },

//     unitPrice: { type: Number, required: true },
//     totalPrice: { type: Number, required: true },
//   },
//   { _id: false }
// );

// /* ---------- Customer (Order Request) ---------- */
// const CustomerSchema = new Schema(
//   {
//     // Restaurant identifier
//     username: { type: String, required: true },

//     // Table info
//     tableNumber: { type: Number, required: true },

//     // Session identifier
//     sessionId: {
//       type: String,
//       required: true,
//       index: true,
//     },

//     // Customer details
//     customerName: { type: String, required: true },
//     phoneNumber: String,
//     description: String,

//     // Newly ordered items
//     items: { type: [ItemSchema], required: true },

//     // Kept EXACTLY as-is
//     grandTotal: { type: Number, required: true },

//     status: {
//       type: String,
//       default: "pending",
//       enum: ["pending", "confirmed", "completed", "cancelled"],
//     },
    
//     // 🔥 Billing fields
//     billed: {
//       type: Boolean,
//       default: false,
//       index: true,
//     },
//     billedAt: {
//       type: Date,
//     },
//     billId: {
//       type: Schema.Types.ObjectId,
//       ref: "Bill",
//     },
//     // 🔥 NEW: Bill number for quick display
//     billNumber: {
//       type: String,
//     },

//     createdAt: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   { versionKey: false }
// );

// /* Indexes for restaurant-side grouping */
// CustomerSchema.index({ username: 1, sessionId: 1 });
// CustomerSchema.index({ username: 1, tableNumber: 1 });
// CustomerSchema.index({ username: 1, billed: 1 });

// module.exports = mongoose.model("Customer", CustomerSchema);









const mongoose = require("mongoose");

const Schema = mongoose.Schema;

/* ---------- Addons ---------- */
const AddonSchema = new Schema(
  {
    id: String,
    name: String,
    price: Number,
  },
  { _id: false }
);

/* ---------- Variants ---------- */
const VariantSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

/* ---------- Items ---------- */
const ItemSchema = new Schema(
  {
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    imageUrl: String,

    qty: { type: Number, required: true },

    variant: { type: VariantSchema, required: true },

    addons: { type: [AddonSchema], default: [] },

    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
  },
  { _id: false }
);

/* ---------- Delivery Schema (ONLINE orders only) ---------- */
const DeliverySchema = new Schema(
  {
    boyName: { type: String },
    boyPhone: { type: String },
    assignedAt: { type: Date },
    status: {
      type: String,
      enum: ["not_assigned", "assigned", "out_for_delivery", "delivered"],
      default: "not_assigned",
    },
  },
  { _id: false }
);

/* ---------- Customer (Order Request) ---------- */
const CustomerSchema = new Schema(
  {
    // Restaurant identifier
    username: { type: String, required: true },

    // Order type
    orderType: {
      type: String,
      enum: ["DINE_IN", "TAKEAWAY", "ONLINE"],
      default: "DINE_IN",
    },

    // Table info (DINE_IN only)
    tableNumber: { type: Number,  required: function () {
    return this.orderType === "DINE_IN";
  } },

    // Session identifier (DINE_IN only)
    sessionId: {
      type: String,
       required: function () {
    return this.orderType === "DINE_IN";
  },
      index: true,
    },

    // Customer details
    customerName: { type: String, required: true },
    phoneNumber: String,
    description: String,

    // Delivery address (ONLINE only)
    deliveryAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String,
    },

    // Newly ordered items
    items: { type: [ItemSchema], required: true },

    grandTotal: { type: Number, required: true },

    status: {
      type: String,
      default: "pending",
      enum: ["pending", "confirmed", "completed", "cancelled"],
    },

    // Delivery tracking (ONLINE orders only)
    delivery: {
      type: DeliverySchema,
      default: function() {
        return this.orderType === "ONLINE" ? { status: "not_assigned" } : undefined;
      },
    },

    // Billing fields
    billed: {
      type: Boolean,
      default: false,
      index: true,
    },
    billedAt: {
      type: Date,
    },
    billId: {
      type: Schema.Types.ObjectId,
      ref: "Bill",
    },
    billNumber: {
      type: String,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

/* Indexes for restaurant-side grouping */
CustomerSchema.index({ username: 1, sessionId: 1 });
CustomerSchema.index({ username: 1, tableNumber: 1 });
CustomerSchema.index({ username: 1, billed: 1 });
CustomerSchema.index({ username: 1, orderType: 1 });
CustomerSchema.index({ "delivery.status": 1 });

module.exports = mongoose.model("Customer", CustomerSchema);