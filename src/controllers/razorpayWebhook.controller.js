// const crypto = require("crypto");
// const Owner = require("../models/Owner");

// exports.handleRazorpayWebhook = async (req, res) => {
//   try {
//     const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

//     const shasum = crypto.createHmac("sha256", secret);
//     shasum.update(JSON.stringify(req.body));
//     const digest = shasum.digest("hex");

//     const razorpaySignature = req.headers["x-razorpay-signature"];

//     // 🔐 Verify webhook signature
//     if (digest !== razorpaySignature) {
//       return res.status(400).json({ message: "Invalid webhook signature" });
//     }

//     const event = req.body.event;
//     const payload = req.body.payload;

//     // Subscription activated (trial ended)
//     if (event === "subscription.activated") {
//       const subscriptionId = payload.subscription.entity.id;

//       await Owner.findOneAndUpdate(
//         { "subscription.razorpaySubscriptionId": subscriptionId },
//         {
//           $set: {
//             "subscription.status": "ACTIVE",
//             "subscription.currentPeriodEnd": new Date(
//               payload.subscription.entity.current_end * 1000
//             )
//           }
//         }
//       );
//     }

//     // Subscription cancelled
//     if (event === "subscription.cancelled") {
//       const subscriptionId = payload.subscription.entity.id;

//       await Owner.findOneAndUpdate(
//         { "subscription.razorpaySubscriptionId": subscriptionId },
//         {
//           $set: {
//             "subscription.status": "CANCELLED"
//           }
//         }
//       );
//     }

//     // Payment failed
//     if (event === "subscription.halted") {
//       const subscriptionId = payload.subscription.entity.id;

//       await Owner.findOneAndUpdate(
//         { "subscription.razorpaySubscriptionId": subscriptionId },
//         {
//           $set: {
//             "subscription.status": "EXPIRED"
//           }
//         }
//       );
//     }

//     res.status(200).json({ status: "ok" });

//   } catch (error) {
//     console.error("Webhook error:", error);
//     res.status(500).json({ message: "Webhook processing failed" });
//   }
// };









// const crypto = require("crypto");
// const Owner = require("../models/Owner");

// exports.handleRazorpayWebhook = async (req, res) => {
//   try {
//     const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

//     // 🔐 Verify signature
//     const shasum = crypto.createHmac("sha256", secret);
//     shasum.update(JSON.stringify(req.body));
//     const digest = shasum.digest("hex");

//     const razorpaySignature = req.headers["x-razorpay-signature"];

//     if (digest !== razorpaySignature) {
//       return res.status(400).json({ message: "Invalid webhook signature" });
//     }

//     const event = req.body.event;
//     const payload = req.body.payload;
//     const subscription = payload.subscription?.entity;

//     if (!subscription) {
//       return res.status(200).json({ status: "ignored" });
//     }

//     const subscriptionId = subscription.id;

//     /* ------------------------------------
//        1️⃣ AUTOPAY APPROVED → TRIALING
//     ------------------------------------ */
//     if (event === "subscription.authenticated") {
//       const TRIAL_DAYS = 30;

//       await Owner.findOneAndUpdate(
//         { "subscription.razorpaySubscriptionId": subscriptionId },
//         {
//           $set: {
//             "subscription.status": "TRIALING",
//             "subscription.trialStart": new Date(),
//             "subscription.trialEnd": new Date(
//               Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
//             )
//           }
//         }
//       );
//     }

//     /* ------------------------------------
//        2️⃣ BILLING STARTED → ACTIVE
//     ------------------------------------ */
//     if (event === "subscription.activated") {
//       await Owner.findOneAndUpdate(
//         { "subscription.razorpaySubscriptionId": subscriptionId },
//         {
//           $set: {
//             "subscription.status": "ACTIVE",
//             "subscription.currentPeriodEnd": new Date(
//               subscription.current_end * 1000
//             )
//           }
//         }
//       );
//     }

//     /* ------------------------------------
//        3️⃣ PAYMENT FAILED → EXPIRED
//     ------------------------------------ */
//     if (event === "subscription.halted") {
//       await Owner.findOneAndUpdate(
//         { "subscription.razorpaySubscriptionId": subscriptionId },
//         {
//           $set: {
//             "subscription.status": "EXPIRED"
//           }
//         }
//       );
//     }

//     /* ------------------------------------
//        4️⃣ USER CANCELLED → CANCELLED
//     ------------------------------------ */
//     if (event === "subscription.cancelled") {
//       await Owner.findOneAndUpdate(
//         { "subscription.razorpaySubscriptionId": subscriptionId },
//         {
//           $set: {
//             "subscription.status": "CANCELLED"
//           }
//         }
//       );
//     }

//     return res.status(200).json({ status: "ok" });

//   } catch (error) {
//     console.error("Webhook error:", error);
//     return res.status(500).json({ message: "Webhook processing failed" });
//   }
// };









const crypto = require("crypto");
const Owner = require("../models/Owner");

exports.handleRazorpayWebhook = async (req, res) => {

  console.log("🔥 RAZORPAY WEBHOOK HIT AT", new Date().toISOString());
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const razorpaySignature = req.headers["x-razorpay-signature"];

    // 🔐 VERIFY SIGNATURE USING RAW BODY (CRITICAL)
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(req.body); // ✅ RAW BUFFER
    const digest = shasum.digest("hex");

    if (digest !== razorpaySignature) {
      console.error("❌ Invalid Razorpay webhook signature");
      return res.status(400).send("Invalid signature");
    }

    // ✅ Parse JSON AFTER verification
    const payload = JSON.parse(req.body.toString());
    const event = payload.event;
    const subscription = payload.payload?.subscription?.entity;

    if (!subscription) {
      return res.status(200).json({ status: "ignored" });
    }

    const subscriptionId = subscription.id;

    /* ------------------------------------
       1️⃣ AUTOPAY APPROVED → TRIALING
    ------------------------------------ */
    if (event === "subscription.authenticated") {
      const TRIAL_DAYS = 30;

      await Owner.findOneAndUpdate(
        { "subscription.razorpaySubscriptionId": subscriptionId },
        {
          $set: {
            "subscription.status": "TRIALING",
            "subscription.trialStart": new Date(),
            "subscription.trialEnd": new Date(
              Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
            )
          }
        }
      );

      console.log("✅ subscription.authenticated → TRIALING");
    }

    /* ------------------------------------
       2️⃣ BILLING STARTED → ACTIVE
    ------------------------------------ */
    if (event === "subscription.activated") {
      await Owner.findOneAndUpdate(
        { "subscription.razorpaySubscriptionId": subscriptionId },
        {
          $set: {
            "subscription.status": "ACTIVE",
            "subscription.currentPeriodEnd": new Date(
              subscription.current_end * 1000
            )
          }
        }
      );

      console.log("✅ subscription.activated → ACTIVE");
    }

    /* ------------------------------------
       3️⃣ PAYMENT FAILED → EXPIRED
    ------------------------------------ */
    if (event === "subscription.halted") {
      await Owner.findOneAndUpdate(
        { "subscription.razorpaySubscriptionId": subscriptionId },
        {
          $set: { "subscription.status": "EXPIRED" }
        }
      );
    }

    /* ------------------------------------
       4️⃣ USER CANCELLED → CANCELLED
    ------------------------------------ */
    if (event === "subscription.cancelled") {
      await Owner.findOneAndUpdate(
        { "subscription.razorpaySubscriptionId": subscriptionId },
        {
          $set: { "subscription.status": "CANCELLED" }
        }
      );
    }

    return res.status(200).json({ status: "ok" });

  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
};
