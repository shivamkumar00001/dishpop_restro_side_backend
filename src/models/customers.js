const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    username: { type: String, index: true },
    tableNumber: Number,
    customerName: String,
    phoneNumber: String,

    items: [
      {
        itemId: mongoose.Schema.Types.ObjectId,
        name: String,
        qty: Number,
        price: Number,
        imageUrl: String,
      },
    ],

    status: {
      type: String,
      enum: ["pending", "accepted", "preparing", "ready", "served", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
