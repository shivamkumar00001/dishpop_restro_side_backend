const GSTAuditLog = require("../models/GSTAuditLog");
const BillingConfig = require("../models/billinggdetails");
const asyncHandler = require("../middlewares/asyncHandler");
const ErrorHandler = require("../utils/ErrorHandler");
const ExcelJS = require("exceljs");

/**
 * @desc    Get all GST audit logs with filters
 * @route   GET /api/v1/gst-audit/:username/logs
 * @access  Private
 */
exports.getGSTAuditLogs = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const {
    startDate,
    endDate,
    gstType,
    paymentMethod,
    status,
    page = 1,
    limit = 50,
  } = req.query;

  // Authorization check
  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  // Build optimized query
  const query = { username };

  // Date range filter with proper indexing
  if (startDate || endDate) {
    query.billedAt = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query.billedAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.billedAt.$lte = end;
    }
  }

  if (gstType) query.gstType = gstType;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (status === "FINALIZED") {
    query.status = { $ne: "CANCELLED" };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query with lean() for performance
  const [logs, total] = await Promise.all([
    GSTAuditLog.find(query)
      .sort({ billedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v') // Exclude version key
      .lean(),
    GSTAuditLog.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    count: logs.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: logs,
  });
});

/**
 * @desc    Get GST summary for period (OPTIMIZED - PRODUCTION)
 * @route   GET /api/v1/gst-audit/:username/summary
 * @access  Private
 */
exports.getGSTSummary = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { startDate, endDate } = req.query;

  // Authorization check
  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  if (!startDate || !endDate) {
    return next(new ErrorHandler("Please provide startDate and endDate", 400));
  }

  // Parse dates efficiently
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Optimized aggregation pipeline - Direct MongoDB aggregation
  const breakdown = await GSTAuditLog.aggregate([
    {
      $match: {
        username,
        status: { $ne: "CANCELLED" },
        billedAt: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: "$gstType",
        totalBills: { $sum: 1 },
        totalSales: { $sum: "$grandTotal" },
        totalTaxableAmount: { $sum: "$taxableAmount" },
        totalCGST: { $sum: "$cgstAmount" },
        totalSGST: { $sum: "$sgstAmount" },
        totalIGST: { $sum: "$igstAmount" },
        totalGST: { $sum: "$totalGST" }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  // Calculate overall totals efficiently
  const totals = breakdown.reduce(
    (acc, curr) => ({
      totalBills: acc.totalBills + curr.totalBills,
      totalSales: acc.totalSales + curr.totalSales,
      totalTaxableAmount: acc.totalTaxableAmount + curr.totalTaxableAmount,
      totalCGST: acc.totalCGST + curr.totalCGST,
      totalSGST: acc.totalSGST + curr.totalSGST,
      totalIGST: acc.totalIGST + curr.totalIGST,
      totalGST: acc.totalGST + curr.totalGST,
    }),
    {
      totalBills: 0,
      totalSales: 0,
      totalTaxableAmount: 0,
      totalCGST: 0,
      totalSGST: 0,
      totalIGST: 0,
      totalGST: 0,
    }
  );

  res.status(200).json({
    success: true,
    data: {
      breakdown,
      totals,
    },
  });
});

/**
 * @desc    Get monthly GST report
 * @route   GET /api/v1/gst-audit/:username/monthly
 * @access  Private
 */
exports.getMonthlyReport = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { year, month } = req.query;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  if (!year || !month) {
    return next(new ErrorHandler("Please provide year and month", 400));
  }

  const report = await GSTAuditLog.getMonthlyReport(
    username,
    parseInt(year),
    parseInt(month)
  );

  res.status(200).json({
    success: true,
    data: report,
  });
});

/**
 * @desc    Get tax rate wise breakdown
 * @route   GET /api/v1/gst-audit/:username/tax-breakdown
 * @access  Private
 */
exports.getTaxRateBreakdown = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { startDate, endDate } = req.query;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  if (!startDate || !endDate) {
    return next(new ErrorHandler("Please provide startDate and endDate", 400));
  }

  const breakdown = await GSTAuditLog.getTaxRateBreakdown(
    username,
    startDate,
    endDate
  );

  res.status(200).json({
    success: true,
    data: breakdown,
  });
});

/**
 * @desc    Export GST audit logs to Excel (OPTIMIZED FOR PRODUCTION)
 * @route   GET /api/v1/gst-audit/:username/export
 * @access  Private
 */
exports.exportGSTAuditToExcel = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { startDate, endDate, gstType } = req.query;

  // Authorization check
  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  if (!startDate || !endDate) {
    return next(new ErrorHandler("Please provide startDate and endDate", 400));
  }

  // Parse dates
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Build query
  const query = {
    username,
    status: { $ne: "CANCELLED" },
    billedAt: { $gte: start, $lte: end },
  };

  if (gstType) query.gstType = gstType;

  // Fetch data in parallel for performance
  const [logs, billingConfig] = await Promise.all([
    GSTAuditLog.find(query).sort({ billedAt: 1 }).lean(),
    BillingConfig.findOne({ username }).lean()
  ]);

  if (logs.length === 0) {
    return next(new ErrorHandler("No audit logs found for the selected period", 404));
  }

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DishPop GST System';
  workbook.created = new Date();
  workbook.company = billingConfig?.legalName || 'Restaurant';

  // Calculate totals once for efficiency
  const totals = logs.reduce(
    (acc, log) => ({
      count: acc.count + 1,
      subtotal: acc.subtotal + (parseFloat(log.subtotal) || 0),
      discount: acc.discount + (parseFloat(log.discount) || 0),
      taxable: acc.taxable + (parseFloat(log.taxableAmount) || 0),
      cgst: acc.cgst + (parseFloat(log.cgstAmount) || 0),
      sgst: acc.sgst + (parseFloat(log.sgstAmount) || 0),
      igst: acc.igst + (parseFloat(log.igstAmount) || 0),
      totalGST: acc.totalGST + (parseFloat(log.totalGST) || 0),
      grandTotal: acc.grandTotal + (parseFloat(log.grandTotal) || 0),
    }),
    {
      count: 0,
      subtotal: 0,
      discount: 0,
      taxable: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalGST: 0,
      grandTotal: 0,
    }
  );

  // ===========================================
  // SHEET 1: BUSINESS INFO (COVER PAGE)
  // ===========================================
  const infoSheet = workbook.addWorksheet("Business Info");
  
  infoSheet.columns = [
    { header: "Field", key: "field", width: 30 },
    { header: "Value", key: "value", width: 50 }
  ];

  // Title
  infoSheet.mergeCells('A1:B1');
  const titleCell = infoSheet.getCell('A1');
  titleCell.value = '🧾 GST AUDIT REPORT';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF4472C4' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  infoSheet.getRow(1).height = 30;

  infoSheet.addRow({});

  // Business Details
  const businessHeader = infoSheet.addRow({ field: 'BUSINESS DETAILS', value: '' });
  businessHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  businessHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

  [
    { field: "Legal Name", value: billingConfig?.legalName || "N/A" },
    { field: "GST Number", value: billingConfig?.gstNumber || "N/A" },
    { field: "PAN Number", value: billingConfig?.panNumber || "N/A" },
    { field: "Address", value: billingConfig?.address || "N/A" },
    { field: "State", value: billingConfig?.state || "N/A" },
    { field: "Pincode", value: billingConfig?.pincode || "N/A" },
    { field: "Tax Type", value: billingConfig?.taxType || "N/A" },
    { field: "Tax Rate", value: billingConfig?.taxRate ? `${billingConfig.taxRate}%` : "N/A" },
  ].forEach(item => {
    const row = infoSheet.addRow(item);
    row.getCell('field').font = { bold: true };
  });

  infoSheet.addRow({});

  // Report Period
  const periodHeader = infoSheet.addRow({ field: 'REPORT PERIOD', value: '' });
  periodHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  periodHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

  [
    { field: "Start Date", value: start.toLocaleDateString('en-IN') },
    { field: "End Date", value: end.toLocaleDateString('en-IN') },
    { field: "Total Transactions", value: logs.length },
    { field: "Generated On", value: new Date().toLocaleString('en-IN') },
  ].forEach(item => {
    const row = infoSheet.addRow(item);
    row.getCell('field').font = { bold: true };
  });

  infoSheet.addRow({});

  // Quick Summary
  const summaryHeader = infoSheet.addRow({ field: 'QUICK SUMMARY', value: '' });
  summaryHeader.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28A745' } };

  [
    { field: "Total Revenue", value: `₹${totals.grandTotal.toFixed(2)}` },
    { field: "Total GST Collected", value: `₹${totals.totalGST.toFixed(2)}` },
    { field: "Total Taxable Amount", value: `₹${totals.taxable.toFixed(2)}` },
    { field: "Average Bill Value", value: `₹${(totals.grandTotal / totals.count).toFixed(2)}` },
  ].forEach(item => {
    const row = infoSheet.addRow(item);
    row.getCell('field').font = { bold: true };
    row.getCell('value').font = { bold: true, color: { argb: 'FF28A745' } };
  });

  infoSheet.addRow({});

  const noteRow = infoSheet.addRow({ 
    field: "📊 Detailed transaction data is available in the 'Transactions' sheet", 
    value: "" 
  });
  infoSheet.mergeCells(`A${noteRow.number}:B${noteRow.number}`);
  noteRow.font = { italic: true, size: 11, color: { argb: 'FF666666' } };
  noteRow.alignment = { horizontal: 'center' };

  // ===========================================
  // SHEET 2: TRANSACTIONS (DETAILED DATA)
  // ===========================================
  const transSheet = workbook.addWorksheet("Transactions");

  transSheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Bill Number", key: "billNumber", width: 15 },
    { header: "Customer", key: "customer", width: 20 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Table", key: "table", width: 8 },
    { header: "Subtotal", key: "subtotal", width: 12 },
    { header: "Discount", key: "discount", width: 12 },
    { header: "Taxable", key: "taxable", width: 15 },
    { header: "GST Type", key: "gstType", width: 15 },
    { header: "GST Rate", key: "gstRate", width: 10 },
    { header: "CGST", key: "cgst", width: 12 },
    { header: "SGST", key: "sgst", width: 12 },
    { header: "IGST", key: "igst", width: 12 },
    { header: "Total GST", key: "totalGST", width: 12 },
    { header: "Grand Total", key: "grandTotal", width: 15 },
    { header: "Payment", key: "payment", width: 15 },
  ];

  // Style header
  const headerRow = transSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;

  // Batch insert rows for performance
  const rowsData = logs.map(log => {
    const billDate = new Date(log.billedAt);
    const subtotal = parseFloat(log.subtotal) || 0;
    const discount = parseFloat(log.discount) || 0;
    const taxableAmount = parseFloat(log.taxableAmount) || (subtotal - discount);
    const cgstAmount = parseFloat(log.cgstAmount) || 0;
    const sgstAmount = parseFloat(log.sgstAmount) || 0;
    const igstAmount = parseFloat(log.igstAmount) || 0;
    const totalGST = cgstAmount + sgstAmount + igstAmount;
    const grandTotal = parseFloat(log.grandTotal) || 0;

    return {
      date: billDate.toLocaleDateString('en-IN'),
      billNumber: String(log.billNumber || ""),
      customer: String(log.customerName || "Walk-in"),
      phone: String(log.customerPhone || "-"),
      table: parseInt(log.tableNumber) || 0,
      subtotal,
      discount,
      taxable: taxableAmount,
      gstType: String(log.gstType || "NO_GST"),
      gstRate: `${parseFloat(log.gstRate) || 0}%`,
      cgst: cgstAmount,
      sgst: sgstAmount,
      igst: igstAmount,
      totalGST,
      grandTotal,
      payment: String(log.paymentMethod || "CASH"),
    };
  });

  transSheet.addRows(rowsData);

  // Apply formatting to all data rows efficiently
  transSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      ['subtotal', 'discount', 'taxable', 'cgst', 'sgst', 'igst', 'totalGST', 'grandTotal'].forEach(key => {
        row.getCell(key).numFmt = '₹#,##0.00';
      });
      row.alignment = { vertical: 'middle' };
      row.getCell('totalGST').font = { color: { argb: 'FFDC143C' } };
      row.getCell('grandTotal').font = { bold: true };
    }
  });

  // ===========================================
  // SHEET 3: SUMMARY (AGGREGATED DATA)
  // ===========================================
  const summarySheet = workbook.addWorksheet("Summary");

  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 25 }
  ];

  const summaryData = [
    { metric: "Total Bills", value: totals.count },
    { metric: "Total Subtotal", value: totals.subtotal },
    { metric: "Total Discount", value: totals.discount },
    { metric: "Total Taxable Amount", value: totals.taxable },
    { metric: "Total CGST", value: totals.cgst },
    { metric: "Total SGST", value: totals.sgst },
    { metric: "Total IGST", value: totals.igst },
    { metric: "Total GST Collected", value: totals.totalGST },
    { metric: "Total Revenue", value: totals.grandTotal },
  ];

  summaryData.forEach((item, index) => {
    const row = summarySheet.addRow(item);
    if (index > 0) {
      row.getCell('value').numFmt = '₹#,##0.00';
    }
    row.getCell('metric').font = { bold: true };
  });

  const summaryHeaderRow = summarySheet.getRow(1);
  summaryHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  summaryHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };

  // Set active sheet to Business Info
  workbook.views = [{ activeTab: 0, visibility: 'visible' }];

  // Generate filename
  const filename = `GST_Audit_${username}_${startDate}_to_${endDate}.xlsx`;

  // Set headers for download
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // Write to buffer and send
  const buffer = await workbook.xlsx.writeBuffer();
  res.send(buffer);
});

/**
 * @desc    Sync bill to GST audit log (called when bill is finalized)
 * @access  Internal use
 */
exports.syncBillToAuditLog = async (bill, billingConfig) => {
  try {
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let totalGST = bill.totalTax || 0;

    if (billingConfig && billingConfig.taxType === "CGST_SGST") {
      cgstAmount = totalGST / 2;
      sgstAmount = totalGST / 2;
    } else if (billingConfig && billingConfig.taxType === "IGST") {
      igstAmount = totalGST;
    }

    await GSTAuditLog.findOneAndUpdate(
      { billId: bill._id },
      {
        username: bill.username,
        billId: bill._id,
        billNumber: bill.billNumber,
        customerName: bill.customerName,
        customerPhone: bill.phoneNumber,
        subtotal: bill.subtotal,
        discount: bill.discount,
        discountType: bill.discountType,
        taxableAmount: bill.subtotal - (bill.discount || 0),
        gstType: billingConfig?.taxType || "NO_GST",
        gstRate: billingConfig?.taxRate || 0,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalGST,
        serviceChargeAmount: bill.serviceCharge?.amount || 0,
        grandTotal: bill.grandTotal,
        roundingAdjustment: bill.roundingAdjustment || 0,
        paymentMethod: bill.paymentMethod,
        paymentStatus: bill.paymentStatus,
        tableNumber: bill.tableNumber,
        sessionId: bill.sessionId,
        businessGSTNumber: billingConfig?.gstNumber,
        businessPAN: billingConfig?.panNumber,
        businessLegalName: billingConfig?.legalName,
        status: bill.status,
        billedAt: bill.finalizedAt || bill.createdAt,
        finalizedAt: bill.finalizedAt,
        createdBy: bill.createdBy,
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error("❌ Failed to sync GST audit log:", error);
    throw error;
  }
};