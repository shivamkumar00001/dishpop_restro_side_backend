const mongoose = require("mongoose");

/* ===============================
   VARIANT SUB-SCHEMA
================================ */

const VariantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    unit: {
      type: String,
      enum: ["g", "kg", "ml", "l", "piece", "plate", "bowl", "cup"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

/* ===============================
   MAIN DISH SCHEMA
================================ */

const DishSchema = new mongoose.Schema(
  {
    // Restaurant / Owner
    username: {
      type: String,
      required: true,
      index: true,
    },

    // Category
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    foodType: {
      type: String,
      enum: ["veg", "non-veg", "egg", "vegan"],
      required: true,
    },

    // Preparation time in minutes
    preparationTime: {
      type: Number,
      default: 15,
      min: 1,
    },

    // Spice level
    spiceLevel: {
      type: String,
      enum: ["none", "mild", "medium", "hot", "extra-hot"],
      default: "none",
    },

    // Pricing Variants
    variants: {
      type: [VariantSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one variant is required",
      },
    },

    // Tags (Predefined only - references to Tag model)
    tags: [
      {
        type: String,
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
    ],

    // Add-on Groups
    addOnGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AddOnGroup",
      },
    ],

    // Images
    imageUrl: {
      type: String,
    },

    thumbnailUrl: {
      type: String,
    },

    /* ===============================
       AR MODEL SUPPORT
    ================================ */

    arModel: {
      glb: {
        type: String,
      },

      usdz: {
        type: String,
      },

      isAvailable: {
        type: Boolean,
        default: false,
      },
    },

    // Availability
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Analytics
    popularityScore: {
      type: Number,
      default: 0,
    },

    
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* ===============================
   INDEXES (PERFORMANCE)
================================ */

DishSchema.index({ username: 1, categoryId: 1 });
DishSchema.index({ username: 1, tags: 1 });
DishSchema.index({ username: 1, isAvailable: 1 });
DishSchema.index({ popularityScore: -1 });

/* ===============================
   VIRTUAL POPULATE FOR TAG DETAILS
================================ */

DishSchema.virtual("tagDetails", {
  ref: "Tag",
  localField: "tags",
  foreignField: "key",
  justOne: false,
});

/* ===============================
   EXPORT
============================= */

module.exports = mongoose.model("Dish", DishSchema);