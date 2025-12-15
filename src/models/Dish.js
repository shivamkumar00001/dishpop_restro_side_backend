const mongoose = require('mongoose');

const DishSchema = new mongoose.Schema(
  {
    // Restaurant Identifier (USERNAME)
    username: {
      type: String,
      required: true,
      index: true // faster queries
    },

    

    name: { type: String, required: true },
    description: { type: String, default: "" },

    category: { type: String, default: null },

    price: { type: Number, required: true },

    imageUrl: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },

    available: { type: Boolean, default: true },

    // For activity tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },

  {
    timestamps: true
  }
);

module.exports = mongoose.model("Dish", DishSchema);
