const AddOn = require("../models/addOn");
const AddOnGroup = require("../models/addOnGroup");

/**
 * @desc    Get all add-ons
 * @route   GET /api/v1/:username/addons
 * @access  Public
 */
exports.getAddOns = async (req, res) => {
  try {
    const { username } = req.params;

    const addOns = await AddOn.find({ username }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: addOns,
    });
  } catch (error) {
    console.error("Get add-ons error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch add-ons",
    });
  }
};

/**
 * @desc    Create add-on
 * @route   POST /api/v1/:username/addons
 * @access  Private
 */
exports.createAddOn = async (req, res) => {
  try {
    const { username } = req.params;
    const { name, price } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name and price are required",
      });
    }

    const addOn = await AddOn.create({
      username,
      name,
      price,
    });

    res.status(201).json({
      success: true,
      data: addOn,
      message: "Add-on created successfully",
    });
  } catch (error) {
    console.error("Create add-on error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create add-on",
    });
  }
};

/**
 * @desc    Update add-on
 * @route   PATCH /api/v1/:username/addons/:addOnId
 * @access  Private
 */
exports.updateAddOn = async (req, res) => {
  try {
    const { username, addOnId } = req.params;
    const { name, price, isAvailable } = req.body;

    const addOn = await AddOn.findOne({ _id: addOnId, username });

    if (!addOn) {
      return res.status(404).json({
        success: false,
        message: "Add-on not found",
      });
    }

    if (name) addOn.name = name;
    if (price !== undefined) addOn.price = price;
    if (isAvailable !== undefined) addOn.isAvailable = isAvailable;

    await addOn.save();

    res.status(200).json({
      success: true,
      data: addOn,
      message: "Add-on updated successfully",
    });
  } catch (error) {
    console.error("Update add-on error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update add-on",
    });
  }
};

/**
 * @desc    Delete add-on
 * @route   DELETE /api/v1/:username/addons/:addOnId
 * @access  Private
 */
exports.deleteAddOn = async (req, res) => {
  try {
    const { username, addOnId } = req.params;

    // Check if add-on is used in any groups
    const groupCount = await AddOnGroup.countDocuments({
      username,
      addOns: addOnId,
    });

    if (groupCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete add-on. It's used in ${groupCount} group(s).`,
      });
    }

    const addOn = await AddOn.findOneAndDelete({
      _id: addOnId,
      username,
    });

    if (!addOn) {
      return res.status(404).json({
        success: false,
        message: "Add-on not found",
      });
    }

    res.status(200).json({
      success: true,
      data: null,
      message: "Add-on deleted successfully",
    });
  } catch (error) {
    console.error("Delete add-on error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete add-on",
    });
  }
};

/**
 * @desc    Get all add-on groups
 * @route   GET /api/v1/:username/addon-groups
 * @access  Public
 */
exports.getAddOnGroups = async (req, res) => {
  try {
    const { username } = req.params;

    const groups = await AddOnGroup.find({ username })
      .populate("addOns")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    console.error("Get add-on groups error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch add-on groups",
    });
  }
};

/**
 * @desc    Create add-on group
 * @route   POST /api/v1/:username/addon-groups
 * @access  Private
 */
exports.createAddOnGroup = async (req, res) => {
  try {
    const { username } = req.params;
    const { name, minSelection, maxSelection, required, addOns } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    const group = await AddOnGroup.create({
      username,
      name,
      minSelection: minSelection || 0,
      maxSelection: maxSelection || 1,
      required: required || false,
      addOns: addOns || [],
    });

    await group.populate("addOns");

    res.status(201).json({
      success: true,
      data: group,
      message: "Add-on group created successfully",
    });
  } catch (error) {
    console.error("Create add-on group error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create add-on group",
    });
  }
};

/**
 * @desc    Update add-on group
 * @route   PATCH /api/v1/:username/addon-groups/:groupId
 * @access  Private
 */
exports.updateAddOnGroup = async (req, res) => {
  try {
    const { username, groupId } = req.params;
    const { name, minSelection, maxSelection, required, addOns, isAvailable } =
      req.body;

    const group = await AddOnGroup.findOne({ _id: groupId, username });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Add-on group not found",
      });
    }

    if (name) group.name = name;
    if (minSelection !== undefined) group.minSelection = minSelection;
    if (maxSelection !== undefined) group.maxSelection = maxSelection;
    if (required !== undefined) group.required = required;
    if (addOns) group.addOns = addOns;
    if (isAvailable !== undefined) group.isAvailable = isAvailable;

    await group.save();
    await group.populate("addOns");

    res.status(200).json({
      success: true,
      data: group,
      message: "Add-on group updated successfully",
    });
  } catch (error) {
    console.error("Update add-on group error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update add-on group",
    });
  }
};

/**
 * @desc    Delete add-on group
 * @route   DELETE /api/v1/:username/addon-groups/:groupId
 * @access  Private
 */
exports.deleteAddOnGroup = async (req, res) => {
  try {
    const { username, groupId } = req.params;

    const group = await AddOnGroup.findOneAndDelete({
      _id: groupId,
      username,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Add-on group not found",
      });
    }

    res.status(200).json({
      success: true,
      data: null,
      message: "Add-on group deleted successfully",
    });
  } catch (error) {
    console.error("Delete add-on group error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete add-on group",
    });
  }
};