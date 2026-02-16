const Customer = require("../models/customers.js");
const asyncHandler = require("../middlewares/asyncHandler.js");

// exports.getPublicOrdersByRestaurant = asyncHandler(async (req, res) => {
//   const { username } = req.params;

//   // Only expose SAFE fields
//   const orders = await Customer.find({ username })
//     .sort({ createdAt: 1 }) // order of ordering
//     // .select(
//     //   "status tableNumber createdAt items.name items.qty"
//     // )
//     .select(
//   "orderType status tableNumber createdAt items.name items.qty delivery"
// )

//     .lean();

//   res.status(200).json({
//     success: true,
//     count: orders.length,
//     data: orders,
//   });
// });

exports.getPublicOrdersByRestaurant = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const orders = await Customer.find({ username })
    .sort({ createdAt: 1 })
    // .select(
    //   "orderType status tableNumber createdAt items.name items.qty delivery"
    // )
    .select("status tableNumber orderType phoneNumber delivery createdAt items.name items.qty")

    .lean();

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});
