/**
 * Calculate tax for restaurant bills
 *
 * @param {number} amount  Base amount from dishes + addons
 * @param {string} taxType CGST_SGST | IGST | NO_GST | INCLUSIVE_GST
 * @param {number} taxRate Percentage set by restaurant owner (e.g. 2.5, 5, 12, 18)
 */
exports.calculateGST = ({ amount, taxType, taxRate = 0 }) => {
  let gstAmount = 0;
  let baseAmount = amount;
  let totalAmount = amount;

  const rate = Number(taxRate) / 100;

  switch (taxType) {
    /* ---------- GST ADDED ON TOP ---------- */
    case "CGST_SGST":
    case "IGST":
      gstAmount = amount * rate;
      totalAmount = amount + gstAmount;
      break;

    /* ---------- GST INCLUDED IN PRICE ---------- */
    case "INCLUSIVE_GST":
      gstAmount = amount - amount / (1 + rate);
      baseAmount = amount - gstAmount;
      totalAmount = amount;
      break;

    /* ---------- NO GST ---------- */
    case "NO_GST":
    default:
      gstAmount = 0;
      totalAmount = amount;
      break;
  }

  return {
    baseAmount: Number(baseAmount.toFixed(2)),
    gstAmount: Number(gstAmount.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
  };
};
