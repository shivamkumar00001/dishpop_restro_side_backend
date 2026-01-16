const Bill = require("../models/Bill");
const Session = require("../models/session");
const Customer = require("../models/customers");
const asyncHandler = require("../middlewares/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const { deleteCachePattern } = require("../config/redis");
const CustomerAnalytics = require("../models/CustomerAnalytics");

const { syncBillToAuditLog } = require("./gstAuditController");
const BillingConfig = require("../models/billinggdetails");

exports.getAllBills = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const {
    status,
    tableNumber,
    phoneNumber,
    startDate,
    endDate,
    paymentStatus,
    limit = 100,
    page = 1,
  } = req.query;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const query = { username };
  if (status) query.status = status;
  if (tableNumber) query.tableNumber = parseInt(tableNumber);
  if (phoneNumber) query.phoneNumber = phoneNumber;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const bills = await Bill.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .populate("createdBy", "username restaurantName")
    .lean();

  const total = await Bill.countDocuments(query);

  res.status(200).json({
    success: true,
    count: bills.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: bills,
  });
});

exports.getBillById = asyncHandler(async (req, res, next) => {
  const { username, billId } = req.params;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const bill = await Bill.findOne({ _id: billId, username })
    .populate("createdBy", "username restaurantName")
    .populate("sourceOrders");

  if (!bill) {
    return next(new ErrorHandler("Bill not found", 404));
  }

  res.status(200).json({
    success: true,
    data: bill,
  });
});

exports.createBillFromOrders = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const {
    orderIds,
    discount = 0,
    discountType = "NONE",
    taxes = [],
    serviceCharge = { enabled: false },
    additionalCharges = [],
    notes,
  } = req.body;

  console.log("🎬 START: createBillFromOrders");
  console.log("📥 Order IDs:", orderIds);

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return next(new ErrorHandler("Please provide order IDs", 400));
  }

  const orders = await Customer.find({
    _id: { $in: orderIds },
    username,
  });

  console.log(`✅ Found ${orders.length} orders`);

  if (!orders.length) {
    return next(new ErrorHandler("No valid orders found", 404));
  }

  const firstOrder = orders[0];
  const session = await Session.findOne({
    sessionId: firstOrder.sessionId,
    username,
  });

  if (!session) {
    return next(new ErrorHandler("Session not found for orders", 400));
  }

  const existingBill = await Bill.findOne({
    username,
    sourceOrders: { $in: orderIds },
    status: { $ne: "CANCELLED" },
  });

  if (existingBill) {
    return next(
      new ErrorHandler("Bill already exists for these orders", 400)
    );
  }

  const billItems = [];
  for (const order of orders) {
    if (!Array.isArray(order.items)) continue;
    for (const item of order.items) {
      if (!item.itemId) {
        return next(
          new ErrorHandler("Invalid item detected in order", 400)
        );
      }
      billItems.push({
        itemId: String(item.itemId),
        name: item.name,
        imageUrl: item.imageUrl || null,
        qty: item.qty || 1,
        variant: item.variant || null,
        addons: item.addons || [],
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        sourceOrderId: order._id,
      });
    }
  }

  if (!billItems.length) {
    return next(new ErrorHandler("No billable items found", 400));
  }

  const subtotal = billItems.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );

  const DISCOUNT_MAP = {
    PERCENT: "PERCENTAGE",
    FLAT: "FIXED",
    PERCENTAGE: "PERCENTAGE",
    FIXED: "FIXED",
    NONE: "NONE",
  };

  const safeDiscountType = DISCOUNT_MAP[discountType] || "NONE";
  const normalizedTaxes = taxes.map((tax) => ({
    name: tax.name,
    rate: Number(tax.rate),
    amount: 0,
  }));

  const normalizedServiceCharge = {
    enabled: Boolean(serviceCharge.enabled),
    rate: serviceCharge.enabled ? Number(serviceCharge.rate || 0) : 0,
    amount: 0,
  };

  const billNumber = await Bill.generateBillNumber(username);

  const bill = await Bill.create({
    username,
    billNumber,
    sessionId: session.sessionId,
    tableNumber: session.tableNumber,
    customerName: session.customerName,
    phoneNumber: session.phoneNumber,
    items: billItems,
    subtotal,
    grandTotal: subtotal,
    status: "DRAFT",
    discount,
    discountType: safeDiscountType,
    taxes: normalizedTaxes,
    serviceCharge: normalizedServiceCharge,
    additionalCharges,
    notes,
    sourceOrders: orderIds,
    createdBy: req.user._id,
    auditLog: [
      {
        action: "BILL_CREATED",
        performedBy: req.user._id,
        details: { orderIds, fromOrders: true },
        timestamp: new Date(),
      },
    ],
  });

  console.log(`✅ Bill created: ${bill.billNumber}`);

  // 🔥 Update orders as billed
  console.log("📝 Updating orders as billed...");
  
  try {
    const updateResult = await Customer.updateMany(
      { _id: { $in: orderIds } },
      { 
        $set: { 
          billed: true,
          billedAt: new Date(),
          billId: bill._id,
          billNumber: bill.billNumber  // 🔥 Store bill number
        } 
      }
    );

    console.log("✅ Update result:", {
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount
    });

    if (updateResult.modifiedCount === 0) {
      console.log("⚠️ WARNING: No orders were modified!");
    }

  } catch (updateError) {
    console.error("❌ ERROR updating orders:", updateError);
  }

  // 🔥 FIX: Update session to billed status when bill is created
  console.log("📝 Updating session to billed...");
  session.orders = [...new Set([...session.orders, ...orderIds])];
  await session.markAsBilled(bill._id);
  await session.save();
  console.log("✅ Session marked as billed");

  // Clear cache
  await deleteCachePattern(`orders:${username}:*`);

  // Wait and fetch
  console.log("⏳ Waiting 200ms for MongoDB...");
  await new Promise(resolve => setTimeout(resolve, 200));
  
  console.log("📡 Fetching updated orders...");
  const updatedOrders = await Customer.find({ 
    _id: { $in: orderIds } 
  }).lean();

  console.log("📡 Updated orders:");
  updatedOrders.forEach(order => {
    console.log(`   #${order._id.toString().slice(-6)}: billed=${order.billed}, billId=${order.billId ? order.billId.toString().slice(-6) : 'null'}`);
  });

  // Emit events
  if (req.io) {
    console.log("📡 Emitting socket events...");
    
    req.io.to(`restaurant:${username}`).emit("bill:created", {
      type: "created",
      bill: bill.toObject(),
      timestamp: Date.now(),
    });

    updatedOrders.forEach(order => {
      req.io.to(`restaurant:${username}`).emit("order:updated", {
        type: "updated",
        order: order,
        timestamp: Date.now(),
      });
      console.log(`   ✅ Emitted order:updated for ${order._id.toString().slice(-6)}`);
    });
    
    console.log(`✅ Emitted ${updatedOrders.length} order updates`);
  } else {
    console.warn("⚠️ Socket.io not available");
  }

  console.log("🎬 END: createBillFromOrders - SUCCESS\n");

  res.status(201).json({
    success: true,
    message: "Bill created successfully",
    data: bill,
    updatedOrders: updatedOrders.length,
  });
});

exports.createBillFromSelectedItems = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const {
    orderItems,
    discount = 0,
    discountType = "NONE",
    taxes = [],
    serviceCharge = { enabled: false },
    additionalCharges = [],
    notes,
  } = req.body;

  console.log("🎬 START: createBillFromSelectedItems");
  console.log("📥 Request body:", JSON.stringify({ orderItems, discount, discountType }, null, 2));

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    console.log("❌ ERROR: No order items provided");
    return next(new ErrorHandler("Please provide order items", 400));
  }

  const orderIds = orderItems.map(oi => oi.orderId);
  console.log("📦 Order IDs to bill:", orderIds);

  const orders = await Customer.find({
    _id: { $in: orderIds },
    username,
  });

  console.log(`✅ Found ${orders.length} orders`);

  if (!orders.length) {
    return next(new ErrorHandler("No valid orders found", 404));
  }

  const firstOrder = orders[0];
  const session = await Session.findOne({
    sessionId: firstOrder.sessionId,
    username,
  });

  if (!session) {
    return next(new ErrorHandler("Session not found for orders", 400));
  }

  console.log("✅ Session found:", session.sessionId);

  const existingBill = await Bill.findOne({
    username,
    sourceOrders: { $in: orderIds },
    status: { $ne: "CANCELLED" },
  });

  if (existingBill) {
    console.log("❌ Bill already exists:", existingBill.billNumber);
    return next(
      new ErrorHandler("Bill already exists for these orders", 400)
    );
  }

  const billItems = [];
  for (const orderItem of orderItems) {
    const order = orders.find(o => o._id.toString() === orderItem.orderId);
    if (!order || !Array.isArray(order.items)) {
      console.log(`⚠️ Skipping order ${orderItem.orderId} - no items`);
      continue;
    }

    const selectedIndexes = orderItem.itemIndexes || 
      order.items.map((_, idx) => idx);

    console.log(`📋 Order ${order._id.toString().slice(-6)}: selecting ${selectedIndexes.length} items`);

    for (const itemIndex of selectedIndexes) {
      const item = order.items[itemIndex];
      if (!item || !item.itemId) continue;

      billItems.push({
        itemId: String(item.itemId),
        name: item.name,
        imageUrl: item.imageUrl || null,
        qty: item.qty || 1,
        variant: item.variant || null,
        addons: item.addons || [],
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        sourceOrderId: order._id,
      });
    }
  }

  if (!billItems.length) {
    return next(new ErrorHandler("No billable items found", 400));
  }

  console.log(`✅ Built ${billItems.length} bill items`);

  const subtotal = billItems.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );

  const DISCOUNT_MAP = {
    PERCENT: "PERCENTAGE",
    FLAT: "FIXED",
    PERCENTAGE: "PERCENTAGE",
    FIXED: "FIXED",
    NONE: "NONE",
  };

  const safeDiscountType = DISCOUNT_MAP[discountType] || "NONE";
  const normalizedTaxes = taxes.map((tax) => ({
    name: tax.name,
    rate: Number(tax.rate),
    amount: 0,
  }));

  const normalizedServiceCharge = {
    enabled: Boolean(serviceCharge.enabled),
    rate: serviceCharge.enabled ? Number(serviceCharge.rate || 0) : 0,
    amount: 0,
  };

  const billNumber = await Bill.generateBillNumber(username);

  console.log(`💰 Creating bill ${billNumber}...`);

  const bill = await Bill.create({
    username,
    billNumber,
    sessionId: session.sessionId,
    tableNumber: session.tableNumber,
    customerName: session.customerName,
    phoneNumber: session.phoneNumber,
    items: billItems,
    subtotal,
    grandTotal: subtotal,
    status: "DRAFT",
    discount,
    discountType: safeDiscountType,
    taxes: normalizedTaxes,
    serviceCharge: normalizedServiceCharge,
    additionalCharges,
    notes,
    sourceOrders: orderIds,
    createdBy: req.user._id,
    auditLog: [
      {
        action: "BILL_CREATED",
        performedBy: req.user._id,
        details: { 
          orderIds, 
          fromOrders: true,
          itemCount: billItems.length,
          partial: orderItems.some(oi => oi.itemIndexes && oi.itemIndexes.length > 0)
        },
        timestamp: new Date(),
      },
    ],
  });

  console.log(`✅ Bill created: ${bill.billNumber} (${bill._id})`);

  // 🔥 CRITICAL: Update orders as billed
  console.log("📝 Updating orders as billed...");
  
  try {
    const updateResult = await Customer.updateMany(
      { _id: { $in: orderIds } },
      { 
        $set: { 
          billed: true,
          billedAt: new Date(),
          billId: bill._id,
          billNumber: bill.billNumber  // 🔥 Store bill number
        } 
      }
    );

    console.log("✅ Update result:", {
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged
    });

    if (updateResult.modifiedCount === 0) {
      console.log("⚠️ WARNING: No orders were modified!");
    }

  } catch (updateError) {
    console.error("❌ ERROR updating orders:", updateError);
  }

  // 🔥 FIX: Update session to billed status when bill is created
  console.log("📝 Updating session to billed...");
  session.orders = [...new Set([...session.orders, ...orderIds])];
  await session.markAsBilled(bill._id);
  await session.save();
  console.log("✅ Session marked as billed");

  // Clear cache
  console.log("🗑️ Clearing cache...");
  await deleteCachePattern(`orders:${username}:*`);
  console.log("✅ Cache cleared");

  // 🔥 CRITICAL: Wait for MongoDB to persist, then fetch fresh data
  console.log("⏳ Waiting 200ms for MongoDB persistence...");
  await new Promise(resolve => setTimeout(resolve, 200));
  
  console.log("📡 Fetching updated orders...");
  const updatedOrders = await Customer.find({ 
    _id: { $in: orderIds } 
  }).lean();

  console.log("✅ Fetched orders:");
  updatedOrders.forEach(order => {
    console.log(`   Order #${order._id.toString().slice(-6)}:`, {
      billed: order.billed,
      billedAt: order.billedAt ? 'set' : 'null',
      billId: order.billId ? order.billId.toString().slice(-6) : 'null'
    });
  });

  // Emit bill created event
  if (req.io) {
    console.log("📡 Emitting socket events...");
    
    req.io.to(`restaurant:${username}`).emit("bill:created", {
      type: "created",
      bill: bill.toObject(),
      timestamp: Date.now(),
    });
    console.log("✅ Emitted bill:created");

    // Emit order updates
    let emittedCount = 0;
    updatedOrders.forEach(order => {
      req.io.to(`restaurant:${username}`).emit("order:updated", {
        type: "updated",
        order: order,
        timestamp: Date.now(),
      });
      emittedCount++;
      console.log(`   ✅ Emitted order:updated for ${order._id.toString().slice(-6)}`);
    });
    
    console.log(`✅ Emitted ${emittedCount} order updates to room: restaurant:${username}`);
  } else {
    console.log("⚠️ Socket.io not available - updates not emitted");
  }

  console.log("🎬 END: createBillFromSelectedItems - SUCCESS\n");

  res.status(201).json({
    success: true,
    message: "Bill created successfully",
    data: bill,
    updatedOrders: updatedOrders.length,
  });
});

exports.createBillManually = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const {
    tableNumber,
    customerName,
    phoneNumber,
    items,
    discount,
    discountType,
    taxes,
    serviceCharge,
    additionalCharges,
    notes,
  } = req.body;

  console.log("🎬 START: createBillManually");
  console.log("📥 Request data:", JSON.stringify({
    tableNumber,
    customerName,
    phoneNumber,
    itemCount: items?.length,
    discount,
    discountType,
  }, null, 2));

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  // Validate required fields
  if (!tableNumber || !customerName || !phoneNumber) {
    console.log("❌ Missing required fields");
    return next(
      new ErrorHandler("Please provide table number, customer name, and phone number", 400)
    );
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    console.log("❌ No items provided");
    return next(
      new ErrorHandler("Please provide at least one item", 400)
    );
  }

  // Validate each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.itemId || !item.name || !item.qty || !item.unitPrice || !item.totalPrice) {
      console.log(`❌ Invalid item at index ${i}:`, item);
      return next(
        new ErrorHandler(`Item at index ${i} is missing required fields`, 400)
      );
    }
  }

  console.log("✅ Validation passed");

  // Find or create session
  let session;
  try {
    const sessionResult = await Session.findOrCreate(
      username,
      tableNumber,
      customerName,
      phoneNumber
    );
    session = sessionResult.session;
    console.log("✅ Session found/created:", session.sessionId);
  } catch (sessionError) {
    console.error("❌ Session creation failed:", sessionError);
    return next(new ErrorHandler("Failed to create session", 500));
  }

  // Generate bill number
  let billNumber;
  try {
    billNumber = await Bill.generateBillNumber(username);
    console.log("✅ Bill number generated:", billNumber);
  } catch (billNumError) {
    console.error("❌ Bill number generation failed:", billNumError);
    return next(new ErrorHandler("Failed to generate bill number", 500));
  }

  // Process taxes
  const taxesArray = [];
  if (taxes && Array.isArray(taxes)) {
    taxes.forEach((tax) => {
      if (tax.name && tax.rate !== undefined) {
        taxesArray.push({
          name: tax.name,
          rate: parseFloat(tax.rate),
          amount: 0,
        });
      }
    });
  }

  // Process service charge
  const serviceChargeObj = {
    enabled: serviceCharge?.enabled || false,
    rate: serviceCharge?.enabled ? parseFloat(serviceCharge.rate || 0) : 0,
    amount: 0,
  };

  // Create bill
  let bill;
  try {
    console.log("💰 Creating bill with data:", {
      username,
      billNumber,
      sessionId: session.sessionId,
      tableNumber,
      itemCount: items.length,
    });

    // ✅ FIX: Let the Bill model calculate subtotal and grandTotal via pre-save hook
    // We must provide a placeholder value that will be recalculated
    const billData = {
      username,
      billNumber,
      sessionId: session.sessionId,
      tableNumber,
      customerName,
      phoneNumber,
      items,
      subtotal: 0,  // ✅ Placeholder - will be calculated by pre-save hook
      grandTotal: 0, // ✅ Placeholder - will be calculated by pre-save hook
      discount: discount || 0,
      discountType: discountType || "NONE",
      taxes: taxesArray,
      serviceCharge: serviceChargeObj,
      additionalCharges: additionalCharges || [],
      notes,
      createdBy: req.user._id,
      auditLog: [
        {
          action: "BILL_CREATED",
          performedBy: req.user._id,
          details: { manual: true },
          timestamp: new Date(),
        },
      ],
    };

    console.log("📋 Bill data prepared, creating...");
    bill = await Bill.create(billData);

    console.log("✅ Bill created successfully:", {
      billNumber: bill.billNumber,
      subtotal: bill.subtotal,
      grandTotal: bill.grandTotal,
    });
  } catch (createError) {
    console.error("❌ Bill creation failed:", createError);
    console.error("Stack:", createError.stack);
    return next(new ErrorHandler(`Failed to create bill: ${createError.message}`, 500));
  }

  // Emit socket event
  if (req.io) {
    req.io.to(`restaurant:${username}`).emit("bill:created", {
      type: "created",
      bill: bill.toObject(),
      timestamp: Date.now(),
    });
    console.log("📡 Socket event emitted");
  }

  console.log("🎬 END: createBillManually - SUCCESS\n");

  res.status(201).json({
    success: true,
    message: "Bill created successfully",
    data: bill,
  });
});

exports.updateBillItems = asyncHandler(async (req, res, next) => {
  const { username, billId } = req.params;
  const { items } = req.body;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const bill = await Bill.findOne({ _id: billId, username });

  if (!bill) {
    return next(new ErrorHandler("Bill not found", 404));
  }

  if (bill.status === "FINALIZED") {
    return next(new ErrorHandler("Cannot modify finalized bill", 400));
  }

  bill.items = items;
  bill.addAuditLog("ITEM_REMOVED", req.user._id, { items });
  await bill.save();

  if (req.io) {
    req.io.to(`restaurant:${username}`).emit("bill:updated", {
      type: "updated",
      bill: bill.toObject(),
      timestamp: Date.now(),
    });
  }

  res.status(200).json({
    success: true,
    message: "Bill items updated successfully",
    data: bill,
  });
});

exports.updateBillCharges = asyncHandler(async (req, res, next) => {
  const { username, billId } = req.params;
  const { discount, discountType, taxes, serviceCharge, additionalCharges } = req.body;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const bill = await Bill.findOne({ _id: billId, username });

  if (!bill) {
    return next(new ErrorHandler("Bill not found", 404));
  }

  if (bill.status === "FINALIZED") {
    return next(new ErrorHandler("Cannot modify finalized bill", 400));
  }

  if (discount !== undefined) {
    bill.discount = discount;
    bill.discountType = discountType || "NONE";
    bill.addAuditLog("DISCOUNT_APPLIED", req.user._id, { discount, discountType });
  }

  if (taxes && Array.isArray(taxes)) {
    bill.taxes = taxes.map((tax) => ({
      name: tax.name,
      rate: parseFloat(tax.rate),
      amount: 0,
    }));
    bill.addAuditLog("TAX_UPDATED", req.user._id, { taxes });
  }

  if (serviceCharge !== undefined) {
    bill.serviceCharge = {
      enabled: serviceCharge.enabled || false,
      rate: serviceCharge.enabled ? parseFloat(serviceCharge.rate || 0) : 0,
      amount: 0,
    };
    bill.addAuditLog("SERVICE_CHARGE_UPDATED", req.user._id, { serviceCharge });
  }

  if (additionalCharges !== undefined) {
    bill.additionalCharges = additionalCharges;
    bill.addAuditLog("ITEM_ADDED", req.user._id, { additionalCharges });
  }

  await bill.save();

  if (req.io) {
    req.io.to(`restaurant:${username}`).emit("bill:updated", {
      type: "updated",
      bill: bill.toObject(),
      timestamp: Date.now(),
    });
  }

  res.status(200).json({
    success: true,
    message: "Bill charges updated successfully",
    data: bill,
  });
});

exports.mergeBills = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { billIds, customerName, phoneNumber, tableNumber } = req.body;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  if (!billIds || !Array.isArray(billIds) || billIds.length < 2) {
    return next(new ErrorHandler("Please provide at least 2 bill IDs to merge", 400));
  }

  const bills = await Bill.find({
    _id: { $in: billIds },
    username,
    status: "DRAFT",
  });

  if (bills.length < 2) {
    return next(new ErrorHandler("At least 2 draft bills are required for merging", 400));
  }

  let finalCustomerName = customerName;
  let finalPhoneNumber = phoneNumber;
  let finalTableNumber = tableNumber;

  if (!finalCustomerName || !finalPhoneNumber) {
    const highestBill = bills.reduce((max, bill) =>
      bill.grandTotal > max.grandTotal ? bill : max
    );
    finalCustomerName = finalCustomerName || highestBill.customerName;
    finalPhoneNumber = finalPhoneNumber || highestBill.phoneNumber;
    finalTableNumber = finalTableNumber || highestBill.tableNumber;
  }

  const mergedItems = [];
  const mergedOrders = [];
  const mergedTables = new Set();

  bills.forEach((bill) => {
    mergedItems.push(...bill.items);
    mergedOrders.push(...bill.sourceOrders);
    mergedTables.add(bill.tableNumber);
    if (bill.mergedTables) {
      bill.mergedTables.forEach((t) => mergedTables.add(t));
    }
  });

  const billNumber = await Bill.generateBillNumber(username);

  const mergedBill = await Bill.create({
    username,
    billNumber,
    sessionId: bills[0].sessionId,
    tableNumber: finalTableNumber,
    mergedTables: Array.from(mergedTables),
    customerName: finalCustomerName,
    phoneNumber: finalPhoneNumber,
    items: mergedItems,
    discount: 0,
    discountType: "NONE",
    taxes: bills[0].taxes || [],
    serviceCharge: bills[0].serviceCharge || { enabled: false, rate: 0, amount: 0 },
    sourceOrders: [...new Set(mergedOrders)],
    mergedFromBills: bills.map((b) => ({
      billId: b._id,
      billNumber: b.billNumber,
      mergedAt: new Date(),
    })),
    createdBy: req.user._id,
    auditLog: [
      {
        action: "BILL_MERGED",
        performedBy: req.user._id,
        details: { billIds, mergedBillNumbers: bills.map((b) => b.billNumber) },
        timestamp: new Date(),
      },
    ],
  });

  await Bill.updateMany(
    { _id: { $in: billIds } },
    {
      $set: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
      $push: {
        auditLog: {
          action: "BILL_CANCELLED",
          performedBy: req.user._id,
          details: { reason: "Merged into " + mergedBill.billNumber },
          timestamp: new Date(),
        },
      },
    }
  );

  if (req.io) {
    req.io.to(`restaurant:${username}`).emit("bill:merged", {
      type: "merged",
      bill: mergedBill.toObject(),
      cancelledBillIds: billIds,
      timestamp: Date.now(),
    });
  }

  res.status(200).json({
    success: true,
    message: "Bills merged successfully",
    data: mergedBill,
  });
});





// Update the finalizeBill function to include GST audit logging
exports.finalizeBill = asyncHandler(async (req, res, next) => {
  const { username, billId } = req.params;
  const { paymentMethod, paidAmount } = req.body;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const bill = await Bill.findOne({ _id: billId, username });

  if (!bill) {
    return next(new ErrorHandler("Bill not found", 404));
  }

  if (bill.status === "FINALIZED") {
    return next(new ErrorHandler("Bill is already finalized", 400));
  }

  if (paymentMethod) bill.paymentMethod = paymentMethod;
  if (paidAmount !== undefined) {
    bill.paidAmount = paidAmount;
    bill.paymentStatus = paidAmount >= bill.grandTotal ? "PAID" : "PARTIAL";
    bill.addAuditLog("PAYMENT_RECEIVED", req.user._id, { paidAmount, paymentMethod });
  }

  await bill.finalize(req.user._id);

  const session = await Session.findOne({ sessionId: bill.sessionId });
  if (session) {
    await session.markAsBilled(bill._id);
  }

  await Customer.updateMany(
    { _id: { $in: bill.sourceOrders } },
    { $set: { status: "completed" } }
  );

  // 🆕 SYNC TO GST AUDIT LOG
  try {
    const billingConfig = await BillingConfig.findOne({ username });
    await syncBillToAuditLog(bill, billingConfig);
    console.log("✅ GST audit log synced");
  } catch (auditError) {
    console.error("❌ GST audit sync failed:", auditError);
    // Don't fail the bill finalization if audit sync fails
  }

  // RECORD CUSTOMER ANALYTICS
  try {
    if (bill.customerName && bill.phoneNumber) {
      const customerAnalytics = await CustomerAnalytics.findOrCreate(
        username,
        bill.customerName,
        bill.phoneNumber
      );

      await customerAnalytics.recordVisit(
        bill.billNumber,
        Number(bill.grandTotal) || 0,
        bill.tableNumber
      );

      console.log("✅ Customer analytics recorded");
    }
  } catch (analyticsError) {
    console.error("❌ Customer analytics failed:", analyticsError);
  }

  await deleteCachePattern(`orders:${username}:*`);

  if (req.io) {
    req.io.to(`restaurant:${username}`).emit("bill:finalized", {
      type: "finalized",
      bill: bill.toObject(),
      timestamp: Date.now(),
    });
  }

  res.status(200).json({
    success: true,
    message: "Bill finalized successfully",
    data: bill,
  });
});


exports.deleteBill = asyncHandler(async (req, res, next) => {
  const { username, billId } = req.params;
  const { reason } = req.body;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const bill = await Bill.findOne({ _id: billId, username });

  if (!bill) {
    return next(new ErrorHandler("Bill not found", 404));
  }

  // 🔥 Remove billed field from orders when bill is cancelled
  if (bill.sourceOrders && bill.sourceOrders.length > 0) {
    const updateResult = await Customer.updateMany(
      { _id: { $in: bill.sourceOrders } },
      { 
        $unset: { 
          billed: "",
          billedAt: "",
          billId: "",
          billNumber: ""  // 🔥 Remove bill number
        }
      }
    );

    console.log("📝 Removed billed status from orders:", {
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount
    });

    // Clear cache
    await deleteCachePattern(`orders:${username}:*`);

    // Wait and fetch updated orders
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const updatedOrders = await Customer.find({ 
      _id: { $in: bill.sourceOrders } 
    }).lean();

    console.log("📡 Fetched orders after unbilling:", 
      updatedOrders.map(o => ({
        id: o._id.toString().slice(-6),
        billed: o.billed,
        billId: o.billId
      }))
    );

    // Emit order updates
    if (req.io) {
      updatedOrders.forEach(order => {
        console.log(`📤 Emitting unbilled order:updated for ${order._id.toString().slice(-6)}`);
        
        req.io.to(`restaurant:${username}`).emit("order:updated", {
          type: "updated",
          order: order,
          timestamp: Date.now(),
        });
      });
      
      console.log(`✅ Emitted ${updatedOrders.length} unbilled order updates`);
    }
  }

  // 🔥 FIX: Revert session back to active when bill is cancelled
  const session = await Session.findOne({ sessionId: bill.sessionId });
  if (session && session.status === 'billed') {
    session.status = 'active';
    session.bills = session.bills.filter(b => b.toString() !== billId);
    await session.save();
    console.log("✅ Session reverted to active");
  }

  await bill.cancel(req.user._id, reason || "Deleted by user");

  if (req.io) {
    req.io.to(`restaurant:${username}`).emit("bill:cancelled", {
      type: "cancelled",
      billId: bill._id,
      timestamp: Date.now(),
    });
  }

  res.status(200).json({
    success: true,
    message: "Bill cancelled successfully",
  });
});

exports.getActiveSessions = asyncHandler(async (req, res, next) => {
  const { username } = req.params;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const sessions = await Session.getActiveSessions(username);

  res.status(200).json({
    success: true,
    count: sessions.length,
    data: sessions,
  });
});

exports.getSessionDetails = asyncHandler(async (req, res, next) => {
  const { username, sessionId } = req.params;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const session = await Session.findOne({ sessionId, username }).populate("orders");

  if (!session) {
    return next(new ErrorHandler("Session not found", 404));
  }

  const bills = await Bill.getBySession(username, sessionId);

  res.status(200).json({
    success: true,
    data: {
      session,
      bills,
    },
  });
});

exports.getBillsByTable = asyncHandler(async (req, res, next) => {
  const { username, tableNumber } = req.params;
  const { status } = req.query;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const query = {
    username,
    tableNumber: parseInt(tableNumber),
  };

  if (status) query.status = status;

  const bills = await Bill.find(query).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: bills.length,
    data: bills,
  });
});

exports.getBillingStats = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { period = "today" } = req.query;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  let startDate = new Date();
  switch (period) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "week":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    default:
      startDate = new Date(0);
  }

  const stats = await Bill.aggregate([
    {
      $match: {
        username,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        totalBills: { $sum: 1 },
        totalRevenue: {
          $sum: { $cond: [{ $eq: ["$status", "FINALIZED"] }, "$grandTotal", 0] },
        },
        avgBillValue: {
          $avg: { $cond: [{ $eq: ["$status", "FINALIZED"] }, "$grandTotal", null] },
        },
        draft: { $sum: { $cond: [{ $eq: ["$status", "DRAFT"] }, 1, 0] } },
        finalized: { $sum: { $cond: [{ $eq: ["$status", "FINALIZED"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    period,
    data: stats[0] || {
      totalBills: 0,
      totalRevenue: 0,
      avgBillValue: 0,
      draft: 0,
      finalized: 0,
      cancelled: 0,
    },
  });
});
