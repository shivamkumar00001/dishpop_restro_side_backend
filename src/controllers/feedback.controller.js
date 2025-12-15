const Review = require("../models/reviews");

/* =========================================================
   FEEDBACK SUMMARY (DASHBOARD)
   GET /api/feedback/summary?username=restaurantUsername
========================================================= */
exports.getFeedbackSummary = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "username is required",
      });
    }

    const summary = await Review.aggregate([
      {
        $match: { username },
      },
      {
        $group: {
          _id: "$username",
          totalReviews: { $sum: 1 },
          avgRating: { $avg: "$rating" },

          excellent: {
            $sum: { $cond: [{ $gte: ["$rating", 4] }, 1, 0] },
          },
          average: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$rating", 2] },
                    { $lt: ["$rating", 4] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          poor: {
            $sum: { $cond: [{ $lt: ["$rating", 2] }, 1, 0] },
          },
        },
      },
    ]);

    if (summary.length === 0) {
      return res.status(200).json({
        success: true,
        summary: {
          avgRating: 0,
          positivePercent: 0,
          totalReviews: 0,
          excellent: 0,
          average: 0,
          poor: 0,
        },
      });
    }

    const data = summary[0];

    const positivePercent =
      data.totalReviews > 0
        ? Math.round((data.excellent / data.totalReviews) * 100)
        : 0;

    return res.status(200).json({
      success: true,
      summary: {
        avgRating: Number(data.avgRating.toFixed(1)),
        positivePercent,
        totalReviews: data.totalReviews,
        excellent: data.excellent,
        average: data.average,
        poor: data.poor,
      },
    });
  } catch (error) {
    console.error("Feedback Summary Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
