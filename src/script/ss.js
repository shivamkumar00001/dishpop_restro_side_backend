// src/script/ss.js
const mongoose = require("mongoose");

/**
 * 🔥 VERY IMPORTANT
 * These lines REGISTER the schemas with Mongoose
 * Without them → MissingSchemaError
 */
require("../models/customers");
require("../models/Bill");

// ⚠️ MongoDB connection string
const MONGODB_URI =
  "mongodb+srv://shivamkumar933401_db_user:tVnRaTw3kaJiabPc@cluster0.vtblmoe.mongodb.net/dineAr";

async function verifyAndFix() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected!\n");

    // ✅ MODEL NAMES MUST MATCH EXACTLY
    const Customer = mongoose.model("Customer");
    const Bill = mongoose.model("Bill");

    // ==========================================
    // STEP 1: CHECK CUSTOMER SCHEMA
    // ==========================================
    console.log("📋 STEP 1: Checking Customer Schema");
    console.log("=".repeat(50));

    const schemaFields = Object.keys(Customer.schema.paths);
    console.log("Schema fields:", schemaFields);

    const hasBilled = schemaFields.includes("billed");
    const hasBilledAt = schemaFields.includes("billedAt");
    const hasBillId = schemaFields.includes("billId");

    console.log(`\n🔍 Has 'billed' field: ${hasBilled ? "✅" : "❌"}`);
    console.log(`🔍 Has 'billedAt' field: ${hasBilledAt ? "✅" : "❌"}`);
    console.log(`🔍 Has 'billId' field: ${hasBillId ? "✅" : "❌"}`);

    if (!hasBilled || !hasBilledAt || !hasBillId) {
      console.log("\n❌ Customer schema is missing billing fields!");
      console.log("📝 FIX: Add these fields to Customer schema\n");
      console.log(`
billed: {
  type: Boolean,
  default: false,
  index: true,
},
billedAt: {
  type: Date,
},
billId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Bill",
},
      `);
      return;
    }

    console.log("\n✅ Schema is correct!\n");

    // ==========================================
    // STEP 2: FIND COMPLETED ORDERS
    // ==========================================
    console.log("📦 STEP 2: Finding Completed Orders");
    console.log("=".repeat(50));

    const completedOrders = await Customer.find({
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log(`\nFound ${completedOrders.length} completed orders\n`);

    if (completedOrders.length === 0) {
      console.log("⚠️ No completed orders found.");
      return;
    }

    completedOrders.forEach((order, i) => {
      console.log(`${i + 1}. Order #${order._id.toString().slice(-6)}`);
      console.log(`   Table: ${order.tableNumber}`);
      console.log(`   Customer: ${order.customerName}`);
      console.log(
        `   Billed: ${
          order.billed === true
            ? "✅ YES"
            : order.billed === false
            ? "❌ NO"
            : "⚠️ UNDEFINED"
        }`
      );
      console.log(`   BillId: ${order.billId || "null"}`);
      console.log(`   BilledAt: ${order.billedAt || "null"}`);
      console.log();
    });

    // ==========================================
    // STEP 3: MANUAL UPDATE TEST
    // ==========================================
    console.log("🔧 STEP 3: Testing Manual Update");
    console.log("=".repeat(50));

    const testOrder = completedOrders[0];

    const updateResult = await Customer.updateOne(
      { _id: testOrder._id },
      {
        $set: {
          billed: true,
          billedAt: new Date(),
        },
      }
    );

    console.log("Update result:", updateResult);

    const updated = await Customer.findById(testOrder._id).lean();

    console.log("\n📊 After Update:");
    console.log(`   Billed: ${updated.billed}`);
    console.log(`   BilledAt: ${updated.billedAt}`);

    if (updated.billed === true) {
      console.log("\n✅ SUCCESS: Manual update works!");
    } else {
      console.log("\n❌ FAILED: Update did not apply");
    }

    // ==========================================
    // STEP 4: CHECK BILLS
    // ==========================================
    console.log("\n💰 STEP 4: Checking Bills");
    console.log("=".repeat(50));

    const bills = await Bill.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log(`\nFound ${bills.length} bills\n`);

    bills.forEach((bill, i) => {
      console.log(`${i + 1}. Bill #${bill.billNumber}`);
      console.log(`   Status: ${bill.status}`);
      console.log(`   Orders: ${bill.sourceOrders?.length || 0}`);
      console.log(`   Created: ${bill.createdAt}`);
      console.log();
    });
  } catch (err) {
    console.error("\n❌ ERROR:", err.message);
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

verifyAndFix();
