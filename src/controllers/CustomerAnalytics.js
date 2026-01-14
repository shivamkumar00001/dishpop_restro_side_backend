const CustomerAnalytics = require("../models/CustomerAnalytics");
const asyncHandler = require("../middlewares/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const ExcelJS = require("exceljs"); // npm install exceljs

/**
 * @desc    Get all customers with analytics
 * @route   GET /api/v1/analytics/:username/customers
 * @access  Private
 */
exports.getAllCustomers = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { 
    sortBy = "lastVisit", 
    order = "desc",
    limit = 100,
    page = 1,
    status,
    minVisits,
    minSpend,
  } = req.query;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  // Build query
  const query = { username };
  if (status) query.status = status;
  if (minVisits) query.totalVisits = { $gte: parseInt(minVisits) };
  if (minSpend) query.totalPurchase = { $gte: parseFloat(minSpend) };

  // Sort mapping
  const sortOptions = {
    lastVisit: { lastVisit: order === "desc" ? -1 : 1 },
    totalVisits: { totalVisits: order === "desc" ? -1 : 1 },
    totalPurchase: { totalPurchase: order === "desc" ? -1 : 1 },
    customerName: { customerName: order === "desc" ? -1 : 1 },
  };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const customers = await CustomerAnalytics.find(query)
    .sort(sortOptions[sortBy] || { lastVisit: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .lean();

  const total = await CustomerAnalytics.countDocuments(query);

  res.status(200).json({
    success: true,
    count: customers.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: customers,
  });
});

/**
 * @desc    Get customer analytics stats
 * @route   GET /api/v1/analytics/:username/stats
 * @access  Private
 */
exports.getCustomerStats = asyncHandler(async (req, res, next) => {
  const { username } = req.params;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const stats = await CustomerAnalytics.getStats(username);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * @desc    Get repeat customers
 * @route   GET /api/v1/analytics/:username/repeat-customers
 * @access  Private
 */
exports.getRepeatCustomers = asyncHandler(async (req, res, next) => {
  const { username } = req.params;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const customers = await CustomerAnalytics.getRepeatCustomers(username);

  res.status(200).json({
    success: true,
    count: customers.length,
    data: customers,
  });
});

/**
 * @desc    Get top customers
 * @route   GET /api/v1/analytics/:username/top-customers
 * @access  Private
 */
exports.getTopCustomers = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { limit = 10 } = req.query;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const customers = await CustomerAnalytics.getTopCustomers(username, parseInt(limit));

  res.status(200).json({
    success: true,
    count: customers.length,
    data: customers,
  });
});

/**
 * @desc    Get inactive customers
 * @route   GET /api/v1/analytics/:username/inactive-customers
 * @access  Private
 */
exports.getInactiveCustomers = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { days = 30 } = req.query;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const customers = await CustomerAnalytics.getInactiveCustomers(
    username,
    parseInt(days)
  );

  res.status(200).json({
    success: true,
    count: customers.length,
    data: customers,
  });
});

/**
 * @desc    Export customer data to Excel
 * @route   GET /api/v1/analytics/:username/export-excel
 * @access  Private
 */
exports.exportToExcel = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { type = "all" } = req.query; // all, repeat, top, inactive

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  // Fetch customers based on type
  let customers;
  let filename;

  switch (type) {
    case "repeat":
      customers = await CustomerAnalytics.getRepeatCustomers(username);
      filename = `repeat-customers-${Date.now()}.xlsx`;
      break;
    case "top":
      customers = await CustomerAnalytics.getTopCustomers(username, 50);
      filename = `top-customers-${Date.now()}.xlsx`;
      break;
    case "inactive":
      customers = await CustomerAnalytics.getInactiveCustomers(username, 30);
      filename = `inactive-customers-${Date.now()}.xlsx`;
      break;
    default:
      customers = await CustomerAnalytics.find({ username })
        .sort({ lastVisit: -1 })
        .lean();
      filename = `all-customers-${Date.now()}.xlsx`;
  }

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Customer Analytics");

  // Define columns
  worksheet.columns = [
    { header: "Customer Name", key: "customerName", width: 25 },
    { header: "Phone Number", key: "phoneNumber", width: 15 },
    { header: "Total Visits", key: "totalVisits", width: 12 },
    { header: "Total Purchase", key: "totalPurchase", width: 15 },
    { header: "Average Purchase", key: "averagePurchase", width: 18 },
    { header: "First Visit", key: "firstVisit", width: 20 },
    { header: "Last Visit", key: "lastVisit", width: 20 },
    { header: "Days Since Last Visit", key: "daysSince", width: 20 },
    { header: "Status", key: "status", width: 10 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

  // Add data rows
  customers.forEach((customer) => {
    const daysSince = Math.floor(
      (new Date() - new Date(customer.lastVisit)) / (1000 * 60 * 60 * 24)
    );

    worksheet.addRow({
      customerName: customer.customerName,
      phoneNumber: customer.phoneNumber,
      totalVisits: customer.totalVisits,
      totalPurchase: `₹${customer.totalPurchase.toFixed(2)}`,
      averagePurchase: `₹${customer.averagePurchase.toFixed(2)}`,
      firstVisit: new Date(customer.firstVisit).toLocaleDateString("en-IN"),
      lastVisit: new Date(customer.lastVisit).toLocaleDateString("en-IN"),
      daysSince: daysSince,
      status: customer.status,
    });
  });

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: "A1",
    to: "I1",
  };

  // Add summary at bottom
  const summaryRow = worksheet.addRow([]);
  summaryRow.getCell(1).value = "SUMMARY";
  summaryRow.getCell(1).font = { bold: true };
  summaryRow.getCell(3).value = customers.reduce((sum, c) => sum + c.totalVisits, 0);
  summaryRow.getCell(4).value = `₹${customers
    .reduce((sum, c) => sum + c.totalPurchase, 0)
    .toFixed(2)}`;

  summaryRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE7E6E6" },
  };

  // Set response headers
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  // Write to response
  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc    Get customer by phone number
 * @route   GET /api/v1/analytics/:username/customer/:phoneNumber
 * @access  Private
 */
exports.getCustomerByPhone = asyncHandler(async (req, res, next) => {
  const { username, phoneNumber } = req.params;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const customer = await CustomerAnalytics.findOne({ username, phoneNumber });

  if (!customer) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  res.status(200).json({
    success: true,
    data: customer,
  });
});

/**
 * @desc    Update customer notes/tags
 * @route   PATCH /api/v1/analytics/:username/customer/:phoneNumber
 * @access  Private
 */
exports.updateCustomer = asyncHandler(async (req, res, next) => {
  const { username, phoneNumber } = req.params;
  const { notes, tags, status } = req.body;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const customer = await CustomerAnalytics.findOne({ username, phoneNumber });

  if (!customer) {
    return next(new ErrorHandler("Customer not found", 404));
  }

  if (notes !== undefined) customer.notes = notes;
  if (tags !== undefined) customer.tags = tags;
  if (status !== undefined) customer.status = status;

  await customer.save();

  res.status(200).json({
    success: true,
    message: "Customer updated successfully",
    data: customer,
  });
});

/**
 * @desc    Record customer visit (called from billing controller)
 * @route   POST /api/v1/analytics/:username/record-visit
 * @access  Private (Internal - called by billing system)
 */
exports.recordVisit = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { customerName, phoneNumber, billNumber, amount, tableNumber } = req.body;

  // Find or create customer
  const customer = await CustomerAnalytics.findOrCreate(
    username,
    customerName,
    phoneNumber
  );

  // Record the visit
  await customer.recordVisit(billNumber, amount, tableNumber);

  res.status(200).json({
    success: true,
    message: "Visit recorded successfully",
    data: customer,
  });
});