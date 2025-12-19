const mongoose = require("mongoose");

const TagSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 30,
    },

    type: {
      type: String,
      enum: ["badge", "diet", "spice", "custom"],
      default: "custom",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

TagSchema.index({ restaurantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Tag", TagSchema);
