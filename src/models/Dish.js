const mongoose = require("mongoose");

const VariantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },   // Small / 250g / Large
    unit: {
      type: String,
      enum: ["g", "kg", "ml", "l", "piece", "plate"],
      required: true,
    },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const DishSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    foodType: {
      type: String,
      enum: ["veg", "non-veg", "egg"],
      required: true,
    },

    variants: {
      type: [VariantSchema],
      validate: (v) => v.length > 0,
    },

    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],

    addOnGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AddOnGroup",
      },
    ],

    imageUrl: String,
    thumbnailUrl: String,

    isAvailable: {
      type: Boolean,
      default: true,
    },

    popularityScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Fast menu loading
DishSchema.index({ username: 1, categoryId: 1 });
DishSchema.index({ username: 1, tags: 1 });

module.exports = mongoose.model("Dish", DishSchema);
