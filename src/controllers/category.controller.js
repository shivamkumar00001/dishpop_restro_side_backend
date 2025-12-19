const Category = require("../models/Category");
const Dish = require("../models/Dish");

/**
 * @desc    Get all categories
 * @route   GET /api/v1/restaurants/:username/categories
 * @access  Public
 */
exports.getCategories = async (req, res) => {
  try {
    const { username } = req.params;

    const categories = await Category.find({
      username,
      isActive: true,
    }).sort({ order: 1, name: 1 });

    // Get dish count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const dishCount = await Dish.countDocuments({
          username,
          categoryId: category._id,
        });

        return {
          ...category.toObject(),
          dishCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: categoriesWithCount,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch categories",
    });
  }
};

/**
 * @desc    Create category
 * @route   POST /api/v1/restaurants/:username/categories
 * @access  Private
 */
exports.createCategory = async (req, res) => {
  try {
    const { username } = req.params;
    const { name, description, icon, order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({
      username,
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const category = await Category.create({
      username,
      name,
      description,
      icon: icon || "🍽️",
      order: order || 0,
    });

    // Emit socket event
    if (req.io) {
      req.io.to(`restaurant:${username}`).emit("category:created", category);
    }

    res.status(201).json({
      success: true,
      data: category,
      message: "Category created successfully",
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create category",
    });
  }
};

/**
 * @desc    Update category
 * @route   PATCH /api/v1/restaurants/:username/categories/:categoryId
 * @access  Private
 */
exports.updateCategory = async (req, res) => {
  try {
    const { username, categoryId } = req.params;
    const { name, description, icon, order, isActive } = req.body;

    const category = await Category.findOne({ _id: categoryId, username });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (icon) category.icon = icon;
    if (order !== undefined) category.order = order;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    // Emit socket event
    if (req.io) {
      req.io.to(`restaurant:${username}`).emit("category:updated", category);
    }

    res.status(200).json({
      success: true,
      data: category,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update category",
    });
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/v1/restaurants/:username/categories/:categoryId
 * @access  Private
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { username, categoryId } = req.params;

    // Check if category has dishes
    const dishCount = await Dish.countDocuments({
      username,
      categoryId,
    });

    if (dishCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${dishCount} dish(es). Please move or delete dishes first.`,
      });
    }

    const category = await Category.findOneAndDelete({
      _id: categoryId,
      username,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Emit socket event
    if (req.io) {
      req.io
        .to(`restaurant:${username}`)
        .emit("category:deleted", { categoryId });
    }

    res.status(200).json({
      success: true,
      data: null,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete category",
    });
  }
};