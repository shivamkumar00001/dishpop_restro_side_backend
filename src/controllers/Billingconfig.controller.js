const BillingConfig = require("../models/billinggdetails");
const asyncHandler = require("../middlewares/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");

/**
 * @desc    Get billing configuration for a restaurant
 * @route   GET /api/v1/billing/config/:username
 * @access  Public (for printing bills)
 */
exports.getBillingConfig = asyncHandler(async (req, res, next) => {
  const { username } = req.params;

  const config = await BillingConfig.findOne({ username });

  if (!config) {
    return next(new ErrorHandler("Billing configuration not found", 404));
  }

  res.status(200).json({
    success: true,
    data: config,
  });
});

/**
 * @desc    Create or update billing configuration
 * @route   POST /api/v1/billing/setup
 * @access  Private (authenticated restaurant owners)
 */
exports.setupBillingConfig = asyncHandler(async (req, res, next) => {
  const {
    legalName,
    gstNumber,
    panNumber,
    address,
    state,
    pincode,
    taxType,
    taxRate,
  } = req.body;

  // Validate required fields
  if (!legalName || !panNumber || !address || !state || !pincode || !taxType) {
    return next(
      new ErrorHandler(
        "Please provide all required fields: legalName, panNumber, address, state, pincode, taxType",
        400
      )
    );
  }

  // Validate tax configuration
  if (taxType !== "NO_GST") {
    if (!gstNumber) {
      return next(
        new ErrorHandler("GST Number is required when tax type is not NO_GST", 400)
      );
    }
    if (!taxRate || taxRate <= 0) {
      return next(
        new ErrorHandler("Tax rate must be greater than 0 when tax type is not NO_GST", 400)
      );
    }
  }

  // Validate PAN format
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!panRegex.test(panNumber)) {
    return next(
      new ErrorHandler("Invalid PAN number format. Expected format: ABCDE1234F", 400)
    );
  }

  // Validate GST format (if provided)
  if (gstNumber && taxType !== "NO_GST") {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
    if (!gstRegex.test(gstNumber)) {
      return next(
        new ErrorHandler(
          "Invalid GST number format. Expected format: 22AAAAA0000A1Z5",
          400
        )
      );
    }
  }

  const username = req.user.username;

  // Upsert: create or update
  const config = await BillingConfig.findOneAndUpdate(
    { username },
    {
      username,
      legalName,
      gstNumber: taxType === "NO_GST" ? null : gstNumber,
      panNumber,
      address,
      state,
      pincode,
      taxType,
      taxRate: taxType === "NO_GST" ? 0 : taxRate,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: "Billing configuration saved successfully",
    data: config,
  });
});

/**
 * @desc    Delete billing configuration
 * @route   DELETE /api/v1/billing/config
 * @access  Private (authenticated restaurant owners)
 */
exports.deleteBillingConfig = asyncHandler(async (req, res, next) => {
  const username = req.user.username;

  const config = await BillingConfig.findOneAndDelete({ username });

  if (!config) {
    return next(new ErrorHandler("Billing configuration not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Billing configuration deleted successfully",
  });
});