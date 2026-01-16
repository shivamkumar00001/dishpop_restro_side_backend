const GSTAuditLog = require("../models/GSTAuditLog");
const Bill = require("../models/Bill");
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

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  const query = { username };

  // Date range filter
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

  const logs = await GSTAuditLog.find(query)
    .sort({ billedAt: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .lean();

  const total = await GSTAuditLog.countDocuments(query);

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
 * @desc    Get GST summary for period
 * @route   GET /api/v1/gst-audit/:username/summary
 * @access  Private
 */
exports.getGSTSummary = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { startDate, endDate } = req.query;

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  if (!startDate || !endDate) {
    return next(new ErrorHandler("Please provide startDate and endDate", 400));
  }

  const summary = await GSTAuditLog.getGSTSummary(username, startDate, endDate);

  // Calculate totals
  const totals = summary.reduce(
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
      breakdown: summary,
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
 * @desc    Export GST audit logs to Excel
 * @route   GET /api/v1/gst-audit/:username/export
 * @access  Private
 */
exports.exportGSTAuditToExcel = asyncHandler(async (req, res, next) => {
  const { username } = req.params;
  const { startDate, endDate, gstType } = req.query;

  console.log("\n🔍 EXPORT REQUEST:");
  console.log("   Username:", username);
  console.log("   Start Date:", startDate);
  console.log("   End Date:", endDate);

  if (req.user.username !== username) {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  if (!startDate || !endDate) {
    return next(new ErrorHandler("Please provide startDate and endDate", 400));
  }

  // Parse dates
  const start = new Date(startDate + "T00:00:00.000");
  const end = new Date(endDate + "T23:59:59.999");

  const query = {
    username,
    status: { $ne: "CANCELLED" },
    billedAt: {
      $gte: start,
      $lte: end,
    },
  };

  if (gstType) query.gstType = gstType;

  const logs = await GSTAuditLog.find(query).sort({ billedAt: 1 }).lean();

  console.log(`   ✅ Found ${logs.length} logs`);

  if (logs.length === 0) {
    return next(new ErrorHandler("No audit logs found for the selected period", 404));
  }

  // Log first record for debugging
  console.log("   📋 First log:", {
    billNumber: logs[0].billNumber,
    customer: logs[0].customerName,
    total: logs[0].grandTotal,
    subtotal: logs[0].subtotal,
  });

  // Get billing config
  const billingConfig = await BillingConfig.findOne({ username });

  // Create workbook
  const workbook = new ExcelJS.Workbook();

  // ===========================================
  // SHEET 1: BUSINESS INFO
  // ===========================================
  const infoSheet = workbook.addWorksheet("Business Info");
  
  infoSheet.addRow(["Field", "Value"]);
  infoSheet.addRow(["Legal Name", billingConfig?.legalName || "N/A"]);
  infoSheet.addRow(["GST Number", billingConfig?.gstNumber || "N/A"]);
  infoSheet.addRow(["PAN Number", billingConfig?.panNumber || "N/A"]);
  infoSheet.addRow(["Address", billingConfig?.address || "N/A"]);
  infoSheet.addRow(["State", billingConfig?.state || "N/A"]);
  infoSheet.addRow(["Pincode", billingConfig?.pincode || "N/A"]);
  infoSheet.addRow(["Tax Type", billingConfig?.taxType || "N/A"]);
  infoSheet.addRow(["Tax Rate", billingConfig?.taxRate ? `${billingConfig.taxRate}%` : "N/A"]);
  infoSheet.addRow([]);
  infoSheet.addRow(["Report Period", ""]);
  infoSheet.addRow(["Start Date", start.toLocaleDateString('en-IN')]);
  infoSheet.addRow(["End Date", end.toLocaleDateString('en-IN')]);
  infoSheet.addRow(["Total Records", logs.length]);

  infoSheet.getColumn(1).width = 25;
  infoSheet.getColumn(2).width = 40;

  console.log("   ✅ Created Business Info sheet");

  // ===========================================
  // SHEET 2: TRANSACTIONS
  // ===========================================
  const transSheet = workbook.addWorksheet("Transactions");

  // Add headers
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
    { header: "Grand Total", key: "grandTotal", width: 12 },
    { header: "Payment", key: "payment", width: 15 },
  ];

  // Add data rows
  let rowCount = 0;
  for (const log of logs) {
    try {
      const billDate = new Date(log.billedAt);
      
      const row = {
        date: billDate.toLocaleDateString('en-IN'),
        billNumber: String(log.billNumber || ""),
        customer: String(log.customerName || ""),
        phone: String(log.customerPhone || "-"),
        table: Number(log.tableNumber || 0),
        subtotal: Number(log.subtotal || 0),
        discount: Number(log.discount || 0),
        taxable: Number(log.taxableAmount || 0),
        gstType: String(log.gstType || "NO_GST"),
        gstRate: String(log.gstRate || 0) + "%",
        cgst: Number(log.cgstAmount || 0),
        sgst: Number(log.sgstAmount || 0),
        igst: Number(log.igstAmount || 0),
        totalGST: Number(log.totalGST || 0),
        grandTotal: Number(log.grandTotal || 0),
        payment: String(log.paymentMethod || "N/A"),
      };

      transSheet.addRow(row);
      rowCount++;

      if (rowCount === 1) {
        console.log("   📝 First row added:", row);
      }
    } catch (err) {
      console.error("   ❌ Error adding row:", err.message);
    }
  }

  console.log(`   ✅ Added ${rowCount} transaction rows`);

  // Format currency columns
  const currencyCols = ["F", "G", "H", "K", "L", "M", "N", "O"];
  currencyCols.forEach((col) => {
    transSheet.getColumn(col).numFmt = "₹#,##0.00";
  });

  // Style headers for both sheets
  [infoSheet, transSheet].forEach((sheet) => {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
  });

  console.log("   ✅ Created Transactions sheet");

  // ===========================================
  // SHEET 3: SUMMARY
  // ===========================================
  const summarySheet = workbook.addWorksheet("Summary");

  const totals = logs.reduce(
    (acc, log) => ({
      count: acc.count + 1,
      subtotal: acc.subtotal + (Number(log.subtotal) || 0),
      discount: acc.discount + (Number(log.discount) || 0),
      taxable: acc.taxable + (Number(log.taxableAmount) || 0),
      cgst: acc.cgst + (Number(log.cgstAmount) || 0),
      sgst: acc.sgst + (Number(log.sgstAmount) || 0),
      igst: acc.igst + (Number(log.igstAmount) || 0),
      totalGST: acc.totalGST + (Number(log.totalGST) || 0),
      grandTotal: acc.grandTotal + (Number(log.grandTotal) || 0),
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

  summarySheet.addRow(["Metric", "Value"]);
  summarySheet.addRow(["Total Bills", totals.count]);
  summarySheet.addRow(["Total Subtotal", `₹${totals.subtotal.toFixed(2)}`]);
  summarySheet.addRow(["Total Discount", `₹${totals.discount.toFixed(2)}`]);
  summarySheet.addRow(["Total Taxable", `₹${totals.taxable.toFixed(2)}`]);
  summarySheet.addRow(["Total CGST", `₹${totals.cgst.toFixed(2)}`]);
  summarySheet.addRow(["Total SGST", `₹${totals.sgst.toFixed(2)}`]);
  summarySheet.addRow(["Total IGST", `₹${totals.igst.toFixed(2)}`]);
  summarySheet.addRow(["Total GST", `₹${totals.totalGST.toFixed(2)}`]);
  summarySheet.addRow(["Total Revenue", `₹${totals.grandTotal.toFixed(2)}`]);

  summarySheet.getColumn(1).width = 25;
  summarySheet.getColumn(2).width = 20;

  // Style summary header
  const summaryHeader = summarySheet.getRow(1);
  summaryHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  summaryHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };

  console.log("   ✅ Created Summary sheet");

  // ===========================================
  // WRITE TO RESPONSE
  // ===========================================
  const filename = `GST_Audit_${username}_${startDate}_to_${endDate}.xlsx`;

  console.log("   📦 Writing Excel file to response...");
  console.log("   📊 Workbook contains:", workbook.worksheets.map(ws => ws.name));

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  // 🔥 CRITICAL: Write to buffer first, then send
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    console.log(`   ✅ Generated Excel buffer: ${buffer.length} bytes`);
    
    res.send(buffer);
    console.log("   ✅ Excel file sent successfully\n");
  } catch (writeError) {
    console.error("   ❌ Error writing Excel:", writeError);
    throw writeError;
  }
});


/**
 * @desc    Sync bill to GST audit log (called when bill is finalized)
 * @access  Internal use
 */
exports.syncBillToAuditLog = async (bill, billingConfig) => {
  try {
    // Calculate GST breakdown based on billing config
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

    console.log(`✅ GST audit log synced for bill ${bill.billNumber}`);
  } catch (error) {
    console.error("❌ Failed to sync GST audit log:", error);
  }
};