const express = require("express");
const router = express.Router();

const isAuthenticated = require("../middlewares/isAuthenticated");
const {
  getAddOns,
  createAddOn,
  updateAddOn,
  deleteAddOn,
  getAddOnGroups,
  createAddOnGroup,
  updateAddOnGroup,
  deleteAddOnGroup,
} = require("../controllers/addOn.controller");

// Add-ons
router.get("/:username/addons", getAddOns);
router.post("/:username/addons", isAuthenticated, createAddOn);
router.patch("/:username/addons/:addOnId", isAuthenticated, updateAddOn);
router.delete("/:username/addons/:addOnId", isAuthenticated, deleteAddOn);

// Add-on groups
router.get("/:username/addon-groups", getAddOnGroups);
router.post("/:username/addon-groups", isAuthenticated, createAddOnGroup);
router.patch(
  "/:username/addon-groups/:groupId",
  isAuthenticated,
  updateAddOnGroup
);
router.delete(
  "/:username/addon-groups/:groupId",
  isAuthenticated,
  deleteAddOnGroup
);

module.exports = router;