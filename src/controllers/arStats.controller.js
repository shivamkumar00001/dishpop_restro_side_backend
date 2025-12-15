const ARStatistics = require("../models/arstatistics");

/* =========================================================
   TRACK AR CLICK
   POST /api/ar-stats/click
========================================================= */
exports.trackARClick = async (req, res) => {
  try {
    const { restaurantId, itemName, imageUrl } = req.body;

    if (!restaurantId || !itemName || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: "restaurantId, itemName, imageUrl are required",
      });
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    await ARStatistics.updateOne(
      {
        restaurantId: String(restaurantId),
        itemName,
        date: today,
      },
      {
        $setOnInsert: {
          imageUrl,
          createdAt: new Date(),
        },
        $inc: { clicks: 1 },
      },
      { upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "AR click tracked successfully",
    });
  } catch (error) {
    console.error("AR CLICK ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================================================
   TOP AR DISHES (DASHBOARD)
   GET /api/ar-stats/top?restaurantId=xxx&limit=10
========================================================= */
exports.getTopARDishes = async (req, res) => {
  try {
    const { restaurantId, limit = 10 } = req.query;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "restaurantId is required",
      });
    }

    const topItems = await ARStatistics.aggregate([
      {
        $match: {
          restaurantId: String(restaurantId),
        },
      },
      {
        $group: {
          _id: "$itemName",
          imageUrl: { $first: "$imageUrl" },
          totalClicks: { $sum: "$clicks" },
        },
      },
      { $sort: { totalClicks: -1 } },
      { $limit: Number(limit) },
    ]);

    return res.status(200).json({
      success: true,
      topItems,
    });
  } catch (error) {
    console.error("TOP AR ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================================================
   WEEKLY AR STATS
   GET /api/ar-stats/weekly?restaurantId=xxx
========================================================= */
exports.getWeeklyARStats = async (req, res) => {
  try {
    const { restaurantId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "restaurantId is required",
      });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const stats = await ARStatistics.find({
      restaurantId: String(restaurantId),
      createdAt: { $gte: sevenDaysAgo },
    })
      .sort({ date: 1 })
      .select("date clicks -_id");

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("WEEKLY AR ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
