const Dish = require("../models/Dish");
const Category = require("../models/Category");
const { uploadBuffer, deleteFromR2 } = require("../helpers/storageR2");

/**
 * @desc    Get full menu with all dishes grouped by category
 * @route   GET /api/v1/restaurants/:username/menu
 * @access  Public
 */
exports.getMenu = async (req, res) => {
  try {
    const { username } = req.params;

    const categories = await Category.find({
      username,
      isActive: true,
    }).sort({ order: 1, name: 1 });

    const dishes = await Dish.find({ username })
      .populate("categoryId", "name icon")
      .populate("tags", "name type color")
      .populate({
        path: "addOnGroups",
        populate: {
          path: "addOns",
          model: "AddOn",
        },
      })
      .sort({ popularityScore: -1, name: 1 });

    const menu = categories.map((category) => ({
      category: {
        _id: category._id,
        name: category.name,
        icon: category.icon,
        description: category.description,
      },
      dishes: dishes.filter(
        (dish) =>
          dish.categoryId &&
          dish.categoryId._id.toString() === category._id.toString()
      ),
    }));

    res.status(200).json({
      success: true,
      data: {
        menu,
        categories,
        totalDishes: dishes.length,
        availableDishes: dishes.filter((d) => d.isAvailable).length,
      },
    });
  } catch (error) {
    console.error("Get menu error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch menu",
    });
  }
};

/**
 * @desc    Create new dish
 * @route   POST /api/v1/restaurants/:username/menu
 * @access  Private
 */
exports.createDish = async (req, res) => {
  try {
    const { username } = req.params;
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
    } = req.body;

    // ================================
    // BASIC VALIDATION
    // ================================
    if (!name || !categoryId || !foodType) {
      return res.status(400).json({
        success: false,
        message: "Name, category, and food type are required",
      });
    }

    // ================================
    // PARSE VARIANTS
    // ================================
    let parsedVariants = variants;
    if (typeof variants === "string") {
      try {
        parsedVariants = JSON.parse(variants);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid variants format",
        });
      }
    }

    if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one variant is required",
      });
    }

    // ================================
    // ENSURE ONLY ONE DEFAULT VARIANT
    // ================================
    const defaultVariants = parsedVariants.filter((v) => v.isDefault);
    if (defaultVariants.length === 0) {
      parsedVariants[0].isDefault = true;
    } else if (defaultVariants.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Only one variant can be set as default",
      });
    }

    // ================================
    // ❌ STRICT VARIANT NAME VALIDATION
    // ================================
    for (let i = 0; i < parsedVariants.length; i++) {
      if (
        !parsedVariants[i].name ||
        typeof parsedVariants[i].name !== "string" ||
        parsedVariants[i].name.trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message: `Variant name is required for variant #${i + 1}`,
        });
      }
    }

    // Normalize variant names
    parsedVariants = parsedVariants.map((variant) => ({
      ...variant,
      name: variant.name.trim(),
    }));

    // ================================
    // IMAGE UPLOAD (R2)
    // ================================
    let imageUrl = null;
    let thumbnailUrl = null;

    if (req.file) {
      const timestamp = Date.now();
      const ext = req.file.mimetype.split("/")[1];

      const imageKey = `restaurants/${username}/dishes/${timestamp}-original.${ext}`;
      const thumbKey = `restaurants/${username}/dishes/${timestamp}-thumb.${ext}`;

      imageUrl = await uploadBuffer(
        req.file.buffer,
        process.env.R2_BUCKET,
        imageKey,
        req.file.mimetype
      );

      thumbnailUrl = await uploadBuffer(
        req.file.buffer,
        process.env.R2_BUCKET,
        thumbKey,
        req.file.mimetype
      );
    }

    // ================================
    // PARSE OPTIONAL ARRAYS
    // ================================
    const parsedTags = tags
      ? typeof tags === "string"
        ? JSON.parse(tags)
        : tags
      : [];

    const parsedAddOns = addOnGroups
      ? typeof addOnGroups === "string"
        ? JSON.parse(addOnGroups)
        : addOnGroups
      : [];

    const parsedAllergens = allergens
      ? typeof allergens === "string"
        ? JSON.parse(allergens)
        : allergens
      : [];

    // ================================
    // CREATE DISH
    // ================================
    const dish = await Dish.create({
      username,
      name,
      description,
      categoryId,
      foodType,
      variants: parsedVariants,
      tags: parsedTags,
      addOnGroups: parsedAddOns,
      imageUrl,
      thumbnailUrl,
      preparationTime: preparationTime || 15,
      spiceLevel: spiceLevel || "none",
      calories,
      servingSize,
      allergens: parsedAllergens,
    });

    await dish.populate("categoryId tags addOnGroups");

    if (req.io) {
      req.io.to(`restaurant:${username}`).emit("dish:created", dish);
    }

    res.status(201).json({
      success: true,
      data: dish,
      message: "Dish created successfully",
    });
  } catch (error) {
    console.error("Create dish error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create dish",
    });
  }
};

/**
 * @desc    Toggle dish availability
 * @route   PATCH /api/v1/restaurants/:username/menu/:dishId/toggle
 * @access  Private
 */
exports.toggleDishAvailability = async (req, res) => {
  try {
    const { username, dishId } = req.params;

    const dish = await Dish.findOne({ _id: dishId, username });
    if (!dish) {
      return res.status(404).json({
        success: false,
        message: "Dish not found",
      });
    }

    dish.isAvailable = !dish.isAvailable;
    await dish.save();

    if (req.io) {
      req.io.to(`restaurant:${username}`).emit("dish:updated", dish);
    }

    res.status(200).json({
      success: true,
      data: dish,
      message: `Dish ${
        dish.isAvailable ? "marked as available" : "marked as unavailable"
      }`,
    });
  } catch (error) {
    console.error("Toggle availability error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to toggle availability",
    });
  }
};

/**
 * @desc    Attach add-on groups to dish
 * @route   PATCH /api/v1/restaurants/:username/menu/:dishId/addons
 * @access  Private
 */
exports.attachAddOnsToDish = async (req, res) => {
  try {
    const { username, dishId } = req.params;
    const { addOnGroupIds } = req.body;

    if (!Array.isArray(addOnGroupIds)) {
      return res.status(400).json({
        success: false,
        message: "Invalid add-on groups",
      });
    }

    const dish = await Dish.findOneAndUpdate(
      { _id: dishId, username },
      { addOnGroups: addOnGroupIds },
      { new: true }
    ).populate({
      path: "addOnGroups",
      populate: { path: "addOns" },
    });

    if (!dish) {
      return res.status(404).json({
        success: false,
        message: "Dish not found",
      });
    }

    if (req.io) {
      req.io.to(`restaurant:${username}`).emit("dish:updated", dish);
    }

    res.status(200).json({
      success: true,
      data: dish,
      message: "Add-ons attached successfully",
    });
  } catch (error) {
    console.error("Attach add-ons error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to attach add-ons",
    });
  }
};
