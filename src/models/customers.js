const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// ===============================
// SUB-SCHEMAS
// ===============================

const AddonSchema = new Schema(
  {
    id: String,
    name: String,
    price: Number,
  },
  { _id: false }
);

const VariantSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

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

// ===============================
// MAIN SCHEMA
// ===============================

const CustomerSchema = new Schema(
  {
    username: { type: String, required: true },
    tableNumber: { type: Number, required: true },
    customerName: { type: String, required: true },
    phoneNumber: String,
    description: String,
    items: { type: [ItemSchema], required: true },
    grandTotal: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24,
    },
  },
  { versionKey: false }
);

CustomerSchema.index({ username: 1, tableNumber: 1 });
CustomerSchema.index({ username: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Customer", CustomerSchema);
