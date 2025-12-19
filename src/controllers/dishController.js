const Dish = require("../models/Dish");
const { uploadBuffer, deleteFromR2 } = require("../helpers/storageR2");

/**
 * @desc    Get single dish
 * @route   GET /api/v1/restaurants/:username/dishes/:dishId
 * @access  Public
 */
exports.getDish = async (req, res) => {
  try {
    const { username, dishId } = req.params;

    const dish = await Dish.findOne({ _id: dishId, username })
      .populate("categoryId", "name icon")
      .populate("tags", "name type color")
      .populate({
        path: "addOnGroups",
        populate: {
          path: "addOns",
          model: "AddOn",
        },
      });

    if (!dish) {
      return res.status(404).json({
        success: false,
        message: "Dish not found",
      });
    }

    res.status(200).json({
      success: true,
      data: dish,
    });
  } catch (error) {
    console.error("Get dish error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dish",
    });
  }
};

/**
 * @desc    Update dish
 * @route   PATCH /api/v1/restaurants/:username/dishes/:dishId
 * @access  Private
 */
exports.updateDish = async (req, res) => {
  try {
    const { username, dishId } = req.params;
    const {
      name,
      description,
      categoryId,
      foodType,
      variants,
      tags,
      addOnGroups,
      preparationTime,
      spiceLevel,
      calories,
      servingSize,
      allergens,
      isAvailable,
      isFeatured,
    } = req.body;

    const dish = await Dish.findOne({ _id: dishId, username });

    if (!dish) {
      return res.status(404).json({
        success: false,
        message: "Dish not found",
      });
    }

    // Parse variants if string
    let parsedVariants = variants;
    if (variants && typeof variants === "string") {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid variants format",
        });
      }
    }

    // Validate variants if provided
    if (parsedVariants) {
      if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one variant is required",
        });
      }

      // Ensure only one default variant
      const defaultVariants = parsedVariants.filter((v) => v.isDefault);
      if (defaultVariants.length === 0) {
        parsedVariants[0].isDefault = true;
      } else if (defaultVariants.length > 1) {
        return res.status(400).json({
          success: false,
          message: "Only one variant can be set as default",
        });
      }
    }

    // Handle image upload to R2
    if (req.file) {
      // Delete old images if they exist
      if (dish.imageUrl) {
        const oldKey = dish.imageUrl.split("/").slice(-3).join("/");
        await deleteFromR2(process.env.R2_BUCKET, oldKey);
      }
      if (dish.thumbnailUrl) {
        const oldThumbKey = dish.thumbnailUrl.split("/").slice(-3).join("/");
        await deleteFromR2(process.env.R2_BUCKET, oldThumbKey);
      }

      // Upload new images
      const timestamp = Date.now();
      const imageKey = `restaurants/${username}/dishes/${timestamp}-original.${
        req.file.mimetype.split("/")[1]
      }`;
      const thumbKey = `restaurants/${username}/dishes/${timestamp}-thumb.${
        req.file.mimetype.split("/")[1]
      }`;

      dish.imageUrl = await uploadBuffer(
        req.file.buffer,
        process.env.R2_BUCKET,
        imageKey,
        req.file.mimetype
      );

      dish.thumbnailUrl = await uploadBuffer(
        req.file.buffer,
        process.env.R2_BUCKET,
        thumbKey,
        req.file.mimetype
      );
    }

    // Parse arrays if needed
    const parsedTags = tags
      ? typeof tags === "string"
        ? JSON.parse(tags)
        : tags
      : undefined;
    const parsedAddOns = addOnGroups
      ? typeof addOnGroups === "string"
        ? JSON.parse(addOnGroups)
        : addOnGroups
      : undefined;
    const parsedAllergens = allergens
      ? typeof allergens === "string"
        ? JSON.parse(allergens)
        : allergens
      : undefined;

    // Update fields
    if (name) dish.name = name;
    if (description !== undefined) dish.description = description;
    if (categoryId) dish.categoryId = categoryId;
    if (foodType) dish.foodType = foodType;
    if (parsedVariants) dish.variants = parsedVariants;
    if (parsedTags) dish.tags = parsedTags;
    if (parsedAddOns) dish.addOnGroups = parsedAddOns;
    if (preparationTime) dish.preparationTime = preparationTime;
    if (spiceLevel) dish.spiceLevel = spiceLevel;
    if (calories !== undefined) dish.calories = calories;
    if (servingSize !== undefined) dish.servingSize = servingSize;
    if (parsedAllergens) dish.allergens = parsedAllergens;
    if (isAvailable !== undefined) dish.isAvailable = isAvailable;
    if (isFeatured !== undefined) dish.isFeatured = isFeatured;

    await dish.save();

    // Populate references
    await dish.populate("categoryId tags addOnGroups");

    // Emit socket event
    if (req.io) {
      req.io.to(`restaurant:${username}`).emit("dish:updated", dish);
    }

    res.status(200).json({
      success: true,
      data: dish,
      message: "Dish updated successfully",
    });
  } catch (error) {
    console.error("Update dish error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update dish",
    });
  }
};

/**
 * @desc    Delete dish
 * @route   DELETE /api/v1/restaurants/:username/dishes/:dishId
 * @access  Private
 */
exports.deleteDish = async (req, res) => {
  try {
    const { username, dishId } = req.params;

    const dish = await Dish.findOne({ _id: dishId, username });

    if (!dish) {
      return res.status(404).json({
        success: false,
        message: "Dish not found",
      });
    }

    // Delete images from R2
    if (dish.imageUrl) {
      const imageKey = dish.imageUrl.split("/").slice(-3).join("/");
      await deleteFromR2(process.env.R2_BUCKET, imageKey);
    }
    if (dish.thumbnailUrl) {
      const thumbKey = dish.thumbnailUrl.split("/").slice(-3).join("/");
      await deleteFromR2(process.env.R2_BUCKET, thumbKey);
    }

    await dish.deleteOne();

    // Emit socket event
    if (req.io) {
      req.io.to(`restaurant:${username}`).emit("dish:deleted", { dishId });
    }

    res.status(200).json({
      success: true,
      data: null,
      message: "Dish deleted successfully",
    });
  } catch (error) {
    console.error("Delete dish error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete dish",
    });
  }
};