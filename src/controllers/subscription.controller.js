// const razorpay = require("../config/razorpay");
// const Owner = require("../models/Owner");

// /**
//  * Map plan name to Razorpay Plan IDs
//  * (these must be LIVE plan IDs)
//  */
// const PLAN_MAP = {
//   MONTHLY: process.env.RZP_PLAN_MONTHLY,
//   QUARTERLY: process.env.RZP_PLAN_QUARTERLY,
//   YEARLY: process.env.RZP_PLAN_YEARLY
// };

// /**
//  * Number of billing cycles per plan
//  */
// const TOTAL_COUNT_MAP = {
//   MONTHLY: 12,
//   QUARTERLY: 4,
//   YEARLY: 1
// };


// exports.createSubscription = async (req, res) => {
//   try {
//     const ownerId = req.user._id;
//     const { plan } = req.body;

//     if (!PLAN_MAP[plan]) {
//       return res.status(400).json({ message: "Invalid subscription plan" });
//     }

//     const owner = await Owner.findById(ownerId);

//     if (!owner) {
//       return res.status(404).json({ message: "Owner not found" });
//     }

//     if (!owner.subscription) {
//       owner.subscription = {};
//     }

//     if (
//       ["TRIALING", "ACTIVE"].includes(owner.subscription.status)
//     ) {
//       return res.status(400).json({
//         message: "Subscription already exists"
//       });
//     }

//     if (owner.subscription.razorpaySubscriptionId) {
//       return res.status(400).json({
//         message: "Subscription already initiated"
//       });
//     }

//    if (!owner.subscription.razorpayCustomerId) {
//   let customerId;

//   // 1️⃣ Try to find existing customer
//   const existingCustomers = await razorpay.customers.all({
//     email: owner.email,
//     count: 1
//   });

//   if (existingCustomers.items.length > 0) {
//     customerId = existingCustomers.items[0].id;
//   } else {
//     // 2️⃣ Create only if not found
//     const customer = await razorpay.customers.create({
//       name: owner.ownerName,
//       email: owner.email,
//       contact: owner.phone
//     });
//     customerId = customer.id;
//   }

//   owner.subscription.razorpayCustomerId = customerId;
//   await owner.save(); // IMPORTANT: persist immediately
// }


//     console.log("Creating subscription:", {
//       plan,
//       planId: PLAN_MAP[plan],
//       total_count: TOTAL_COUNT_MAP[plan],
//       start_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
//     });


//    const subscription = await razorpay.subscriptions.create({
//   plan_id: PLAN_MAP[plan],
//   customer_id: owner.subscription.razorpayCustomerId,
//   total_count: TOTAL_COUNT_MAP[plan], // 🔥 REQUIRED
//   start_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
//   customer_notify: 1
// });


//     owner.subscription.plan = plan;
//     owner.subscription.status = "TRIALING";
//     owner.subscription.trialStart = new Date();
//     owner.subscription.trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
//     owner.subscription.razorpaySubscriptionId = subscription.id;
//     owner.subscription.subscribedAt = new Date();

//     await owner.save();

//     res.status(200).json({
//       subscriptionId: subscription.id,
//       razorpayKey: process.env.RAZORPAY_KEY_ID,
//       trialEnd: owner.subscription.trialEnd,
//       plan
//     });

//   } catch (error) {
//   console.error("Subscription error:", error);

//   return res.status(400).json({
//     success: false,
//     message: error.error?.description || "Subscription creation failed",
//     razorpay: error.error || null
//   });
// }

// };

// // Get current subscription status
// exports.getSubscriptionStatus = async (req, res) => {
//   try {
//     const ownerId = req.user._id;
//     const owner = await Owner.findById(ownerId).select("subscription");

//     if (!owner) {
//       return res.status(404).json({ message: "Owner not found" });
//     }

//     res.status(200).json({
//       subscription: owner.subscription || null
//     });
//   } catch (error) {
//     console.error("Failed to get subscription status:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };





const razorpay = require("../config/razorpay");
const Owner = require("../models/Owner");

/**
 * Map plan name to Razorpay Plan IDs
 */
const PLAN_MAP = {
  MONTHLY: process.env.RZP_PLAN_MONTHLY,
  QUARTERLY: process.env.RZP_PLAN_QUARTERLY,
  YEARLY: process.env.RZP_PLAN_YEARLY
};

/**
 * Number of billing cycles per plan
 */
const TOTAL_COUNT_MAP = {
  MONTHLY: 12,
  QUARTERLY: 4,
  YEARLY: 1
};

exports.createSubscription = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { plan } = req.body;

    if (!PLAN_MAP[plan]) {
      return res.status(400).json({ message: "Invalid subscription plan" });
    }

    const owner = await Owner.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    if (!owner.subscription) {
      owner.subscription = {};
    }

    // 🔒 Block duplicate attempts
    if (
      // ["PENDING_AUTH", "TRIALING", "ACTIVE"].includes(owner.subscription.status)
       ["TRIALING", "ACTIVE"].includes(owner.subscription.status)
    ) {
      return res.status(400).json({
        message: "Subscription already in progress"
      });
    }

    // 🔐 Ensure Razorpay customer exists
    if (!owner.subscription.razorpayCustomerId) {
      let customerId;

      const existingCustomers = await razorpay.customers.all({
        email: owner.email,
        count: 1
      });

      if (existingCustomers.items.length > 0) {
        customerId = existingCustomers.items[0].id;
      } else {
        const customer = await razorpay.customers.create({
          name: owner.ownerName,
          email: owner.email,
          contact: owner.phone
        });
        customerId = customer.id;
      }

      owner.subscription.razorpayCustomerId = customerId;
      await owner.save();
    }
///////////////////////
        if (
      owner.subscription.status === "PENDING_AUTH" &&
      owner.subscription.razorpaySubscriptionId
    ) {
      return res.status(200).json({
        subscriptionId: owner.subscription.razorpaySubscriptionId,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        plan: owner.subscription.plan
      });
    }

//////////////////////////


    // 🧾 Create Razorpay subscription (NO DB TRIAL YET)
    const subscription = await razorpay.subscriptions.create({
      plan_id: PLAN_MAP[plan],
      customer_id: owner.subscription.razorpayCustomerId,
      total_count: TOTAL_COUNT_MAP[plan],
      start_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      customer_notify: 1
    });

    // ✅ ONLY mark as pending auth
    owner.subscription.plan = plan;
    owner.subscription.status = "PENDING_AUTH";
    owner.subscription.razorpaySubscriptionId = subscription.id;
    owner.subscription.subscribedAt = new Date();

    await owner.save();

    return res.status(200).json({
      subscriptionId: subscription.id,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      plan
    });

  } catch (error) {
    console.error("Subscription error:", error);
    return res.status(400).json({
      success: false,
      message: error.error?.description || "Subscription creation failed",
      razorpay: error.error || null
    });
  }
};

// Get current subscription status
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const owner = await Owner.findById(ownerId).select("subscription");

    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    return res.status(200).json({
      subscription: owner.subscription || null
    });
  } catch (error) {
    console.error("Failed to get subscription status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
