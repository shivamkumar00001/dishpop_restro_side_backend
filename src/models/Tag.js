const mongoose = require("mongoose");

/* ===============================
   PREDEFINED TAGS SYSTEM
   - Fixed set of tags
   - No custom tag creation
   - Icon + color for each tag
================================ */

const TagSchema = new mongoose.Schema(
  {
    // Tag identifier (unique key)
    key: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "chef-special",
        "most-loved",
        "trending",
        "dish-of-the-day",
        "romantic-dining",
        "spicy",
        "best-seller",
        "new-arrival",
        "seasonal",
        "signature",
      ],
    },

    // Display name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Icon (emoji or lucide-react icon name)
    icon: {
      type: String,
      required: true,
    },

    // Color for UI
    color: {
      type: String,
      required: true,
      enum: [
        "red",
        "orange",
        "amber",
        "yellow",
        "lime",
        "green",
        "emerald",
        "teal",
        "cyan",
        "blue",
        "indigo",
        "violet",
        "purple",
        "pink",
        "rose",
      ],
    },

    // Description
    description: {
      type: String,
      trim: true,
    },

    // Display order
    order: {
      type: Number,
      default: 0,
    },

    // Active status (for future expansion)
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* ===============================
   INDEXES
================================ */

TagSchema.index({ key: 1 });
TagSchema.index({ isActive: 1, order: 1 });

/* ===============================
   STATIC METHOD: Get All Active Tags
================================ */

TagSchema.statics.getActiveTags = function () {
  return this.find({ isActive: true }).sort({ order: 1 });
};

/* ===============================
   EXPORT
================================ */

module.exports = mongoose.model("Tag", TagSchema);