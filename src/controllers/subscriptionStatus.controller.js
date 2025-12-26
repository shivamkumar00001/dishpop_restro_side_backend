const Owner = require("../models/Owner");

/**
 * READ-ONLY subscription status
 * No DB writes
 * No Razorpay calls
 */
exports.getComputedSubscriptionStatus = async (req, res) => {
  try {
    const ownerId = req.user._id;

    const owner = await Owner.findById(ownerId).select("subscription");

    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    const subscription = owner.subscription;
    const now = new Date();

    // Default response
    if (!subscription || subscription.status === "NOT_SUBSCRIBED") {
      return res.status(200).json({
        plan: null,
        status: "NOT_SUBSCRIBED",
      });
    }

    // Trial active
    if (
      subscription.status === "TRIALING" &&
      subscription.trialEnd &&
      now < new Date(subscription.trialEnd)
    ) {
      return res.status(200).json({
        ...subscription.toObject(),
        computedStatus: "TRIALING",
      });
    }

    // Trial expired → active
    if (
      subscription.status === "TRIALING" &&
      subscription.trialEnd &&
      now >= new Date(subscription.trialEnd)
    ) {
      return res.status(200).json({
        ...subscription.toObject(),
        computedStatus: "ACTIVE",
      });
    }

    // Active / Cancelled but expired
    if (
      ["ACTIVE", "CANCELLED"].includes(subscription.status) &&
      subscription.currentPeriodEnd &&
      now >= new Date(subscription.currentPeriodEnd)
    ) {
      return res.status(200).json({
        ...subscription.toObject(),
        computedStatus: "EXPIRED",
      });
    }

    // Default passthrough
    return res.status(200).json({
      ...subscription.toObject(),
      computedStatus: subscription.status,
    });

  } catch (error) {
    console.error("Fetch subscription status failed:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};