const mongoose = require("mongoose");

const { Schema } = mongoose;

const reviewSchema = new Schema({
  // Restaurant identifier (same as Dish model)
  username: {
    type: String,
    required: true,
    index: true,
  },

  // Rating (1 to 5)
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },

  // Review text
  review: {
    type: String,
    trim: true,
    default: "",
  },

  // Optional customer name
  userName: {
    type: String,
    trim: true,
    default: "",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for faster reads (restaurant reviews)
reviewSchema.index({ username: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
