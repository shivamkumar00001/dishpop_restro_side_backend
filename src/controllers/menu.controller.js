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
      .select("-arModel") // keep menu light
      .populate("categoryId", "name icon")
      .populate("tags", "name type color")
      .populate({
        path: "addOnGroups",
        populate: { path: "addOns", model: "AddOn" },
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
    console.log("req.file:", req.file);
    console.log("req.files:", req.files);


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
      parsedVariants = JSON.parse(variants);
    }

    if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one variant is required",
      });
    }

    const defaultVariants = parsedVariants.filter((v) => v.isDefault);
    if (defaultVariants.length === 0) {
      parsedVariants[0].isDefault = true;
    } else if (defaultVariants.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Only one variant can be set as default",
      });
    }

    parsedVariants = parsedVariants.map((v) => ({
      ...v,
      name: v.name.trim(),
    }));

    // ================================
    // IMAGE UPLOAD (R2)
    // ================================
    let imageUrl = null;
    let thumbnailUrl = null;

    if (req.files?.image?.[0]) {
      const imageFile = req.files.image[0];
      const timestamp = Date.now();
      const ext = imageFile.mimetype.split("/")[1];

      const imageKey = `restaurants/${username}/dishes/${timestamp}-original.${ext}`;
      const thumbKey = `restaurants/${username}/dishes/${timestamp}-thumb.${ext}`;

      imageUrl = await uploadBuffer(
        imageFile.buffer,
        process.env.R2_BUCKET,
        imageKey,
        imageFile.mimetype
      );

      thumbnailUrl = await uploadBuffer(
        imageFile.buffer,
        process.env.R2_BUCKET,
        thumbKey,
        imageFile.mimetype
      );
    }

    // ================================
    // AR MODEL UPLOAD (OPTIONAL)
    // ================================
    let arModel = {
      glb: null,
      usdz: null,
      isAvailable: false,
    };

    if (req.files?.arGlb || req.files?.arUsdz) {
      const timestamp = Date.now();

      if (req.files.arGlb?.[0]) {
        const glbFile = req.files.arGlb[0];
        arModel.glb = await uploadBuffer(
          glbFile.buffer,
          process.env.R2_BUCKET,
          `restaurants/${username}/ar/${timestamp}.glb`,
          glbFile.mimetype
        );
      }

      if (req.files.arUsdz?.[0]) {
        const usdzFile = req.files.arUsdz[0];
        arModel.usdz = await uploadBuffer(
          usdzFile.buffer,
          process.env.R2_BUCKET,
          `restaurants/${username}/ar/${timestamp}.usdz`,
          usdzFile.mimetype
        );
      }

      arModel.isAvailable = Boolean(arModel.glb || arModel.usdz);
    }

    // ================================
    // PARSE OPTIONAL ARRAYS
    // ================================
    const parsedTags = tags ? JSON.parse(tags) : [];
    const parsedAddOns = addOnGroups ? JSON.parse(addOnGroups) : [];
    const parsedAllergens = allergens ? JSON.parse(allergens) : [];

    // ================================
    // CREATE DISH (FINAL FIX)
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
      arModel, // ✅ CORRECT
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
 */
exports.toggleDishAvailability = async (req, res) => {
  try {
    const { username, dishId } = req.params;

    const dish = await Dish.findOne({ _id: dishId, username });
    if (!dish) {
      return res.status(404).json({ success: false, message: "Dish not found" });
    }

    dish.isAvailable = !dish.isAvailable;
    await dish.save();

    if (req.io) {
      req.io.to(`restaurant:${username}`).emit("dish:updated", dish);
    }

    res.status(200).json({
      success: true,
      data: dish,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Attach add-on groups to dish
 */
exports.attachAddOnsToDish = async (req, res) => {
  try {
    const { username, dishId } = req.params;
    const { addOnGroupIds } = req.body;

    const dish = await Dish.findOneAndUpdate(
      { _id: dishId, username },
      { addOnGroups: addOnGroupIds },
      { new: true }
    ).populate({
      path: "addOnGroups",
      populate: { path: "addOns" },
    });

    if (!dish) {
      return res.status(404).json({ success: false, message: "Dish not found" });
    }

    if (req.io) {
      req.io.to(`restaurant:${username}`).emit("dish:updated", dish);
    }

    res.status(200).json({
      success: true,
      data: dish,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
