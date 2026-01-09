const Tag = require("../models/Tag");

/* ===============================
   GET ALL ACTIVE TAGS
   GET /api/tags
================================ */

exports.getAllTags = async (req, res) => {
  try {
    const tags = await Tag.find({ isActive: true }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: tags,
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tags",
      error: error.message,
    });
  }
};

/* ===============================
   GET SINGLE TAG BY KEY
   GET /api/tags/:key
================================ */

exports.getTagByKey = async (req, res) => {
  try {
    const { key } = req.params;

    const tag = await Tag.findOne({ key, isActive: true });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found",
      });
    }

    res.status(200).json({
      success: true,
      data: tag,
    });
  } catch (error) {
    console.error("Error fetching tag:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tag",
      error: error.message,
    });
  }
};

/* ===============================
   ADMIN: UPDATE TAG
   PUT /api/admin/tags/:key
   (Only for updating order/active status)
================================ */

exports.updateTag = async (req, res) => {
  try {
    const { key } = req.params;
    const { order, isActive } = req.body;

    const updateData = {};
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    const tag = await Tag.findOneAndUpdate(
      { key },
      updateData,
      { new: true, runValidators: true }
    );

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found",
      });
    }

    res.status(200).json({
      success: true,
      data: tag,
      message: "Tag updated successfully",
    });
  } catch (error) {
    console.error("Error updating tag:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update tag",
      error: error.message,
    });
  }
};

/* ===============================
   HELPER: Get Tag Details by Keys
   (Used internally by dish controller)
================================ */

exports.getTagsByKeys = async (keys) => {
  try {
    return await Tag.find({ key: { $in: keys }, isActive: true });
  } catch (error) {
    console.error("Error fetching tags by keys:", error);
    return [];
  }
};