const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      trim: true,
    },

    icon: {
      type: String, // emoji OR image URL
      default: "🍽️",
    },

    order: {
      type: Number,
      default: 0,
    },

    // ✅ ADD THIS FIELD - IT WAS MISSING!
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for performance
categorySchema.index({ username: 1, isActive: 1 });
categorySchema.index({ username: 1, order: 1 });

module.exports = mongoose.model("Category", categorySchema);