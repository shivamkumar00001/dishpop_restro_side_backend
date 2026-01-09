 
const BillingConfig = require("../models/billinggdetails");

/* =====================================================
   SETUP / UPDATE BILLING CONFIG (OWNER PROFILE)
   ===================================================== */
exports.setupBilling = async (req, res) => {
  try {
    const username = req.user.username;

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

    /* ---------- BASIC VALIDATION ---------- */
    if (
      !legalName ||
      !panNumber ||
      !address ||
      !state ||
      !pincode ||
      !taxType
    ) {
      return res.status(400).json({
        success: false,
        message: "All required billing fields must be provided",
      });
    }

    /* ---------- TAX VALIDATION ---------- */
    if (taxType !== "NO_GST") {
      if (!gstNumber) {
        return res.status(400).json({
          success: false,
          message: "GST number is mandatory for selected tax type",
        });
      }

      if (taxRate === undefined || taxRate === null) {
        return res.status(400).json({
          success: false,
          message: "Tax rate is required for selected tax type",
        });
      }

      if (Number(taxRate) < 0 || Number(taxRate) > 28) {
        return res.status(400).json({
          success: false,
          message: "Tax rate must be between 0 and 28",
        });
      }
    }

    /* ---------- UPSERT BILLING CONFIG ---------- */
    const billingConfig = await BillingConfig.findOneAndUpdate(
      { username },
      {
        username,
        legalName,
        panNumber,
        gstNumber: taxType === "NO_GST" ? null : gstNumber,
        address,
        state,
        pincode,
        taxType,
        taxRate: taxType === "NO_GST" ? 0 : Number(taxRate),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Billing configuration saved successfully",
      billingConfig,
    });
  } catch (error) {
    console.error("Billing setup error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save billing configuration",
    });
  }
};

/* =====================================================
   GET MY BILLING CONFIG
   ===================================================== */
exports.getMyBilling = async (req, res) => {
  try {
    const billingConfig = await BillingConfig.findOne({
      username: req.user.username,
    });

    return res.status(200).json({
      success: true,
      billingCompleted: Boolean(billingConfig),
      billingConfig,
    });
  } catch (error) {
    console.error("Fetch billing config error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch billing configuration",
    });
  }
};

/* =====================================================
   UPDATE MY BILLING DETAILS (EDIT PROFILE STYLE)
   ===================================================== */
exports.updateMyBilling = async (req, res) => {
  try {
    const username = req.user.username;

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

    /* ---------- CHECK EXISTENCE ---------- */
    const existingBilling = await BillingConfig.findOne({ username });

    if (!existingBilling) {
      return res.status(404).json({
        success: false,
        message: "Billing configuration not found. Please set it up first.",
      });
    }

    /* ---------- BASIC VALIDATION ---------- */
    if (
      !legalName ||
      !panNumber ||
      !address ||
      !state ||
      !pincode ||
      !taxType
    ) {
      return res.status(400).json({
        success: false,
        message: "All required billing fields must be provided",
      });
    }

    /* ---------- TAX VALIDATION ---------- */
    if (taxType !== "NO_GST") {
      if (!gstNumber) {
        return res.status(400).json({
          success: false,
          message: "GST number is mandatory for selected tax type",
        });
      }

      if (taxRate === undefined || taxRate === null) {
        return res.status(400).json({
          success: false,
          message: "Tax rate is required for selected tax type",
        });
      }

      if (Number(taxRate) < 0 || Number(taxRate) > 28) {
        return res.status(400).json({
          success: false,
          message: "Tax rate must be between 0 and 28",
        });
      }
    }

    /* ---------- UPDATE ONLY ---------- */
    existingBilling.legalName = legalName;
    existingBilling.panNumber = panNumber;
    existingBilling.address = address;
    existingBilling.state = state;
    existingBilling.pincode = pincode;
    existingBilling.taxType = taxType;
    existingBilling.gstNumber = taxType === "NO_GST" ? null : gstNumber;
    existingBilling.taxRate =
      taxType === "NO_GST" ? 0 : Number(taxRate);

    await existingBilling.save();

    return res.status(200).json({
      success: true,
      message: "Billing details updated successfully",
      billingConfig: existingBilling,
    });
  } catch (error) {
    console.error("Update billing error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update billing details",
    });
  }
};
