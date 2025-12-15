const mongoose = require("mongoose");
const { Schema } = mongoose;

const ARStatisticsSchema = new Schema(
  {
    restaurantId: {
      type: String,
      required: true,
    },

    itemName: {
      type: String,
      required: true,
    },

    imageUrl: {
      type: String,
      required: true,
    },

    // YYYY-MM-DD
    date: {
      type: String,
      required: true,
    },

    clicks: {
      type: Number,
      default: 0,
    },

    // TTL field
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// UNIQUE per restaurant + item + date
ARStatisticsSchema.index(
  { restaurantId: 1, itemName: 1, date: 1 },
  { unique: true }
);

// TTL index (7 days)
ARStatisticsSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 }
);

module.exports = mongoose.model("ARStatistics", ARStatisticsSchema);
