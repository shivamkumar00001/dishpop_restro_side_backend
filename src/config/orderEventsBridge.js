const Customer = require("../models/customers");
const { deleteCachePattern } = require("./redis");

/**
 * Order Events Bridge
 * Listens to customer order events and broadcasts to restaurant
 */
module.exports = (io) => {
  io.on("connection", (socket) => {
    // ===============================
    // CUSTOMER CREATES ORDER
    // ===============================
    // socket.on("customer:order:create", async (orderData) => {
    //   try {
    //     console.log("📦 New order from customer:", orderData);

    //     const { username, tableNumber, customerName, items, grandTotal } =
    //       orderData;

    //     if (!username || !tableNumber || !customerName || !items || !grandTotal) {
    //       socket.emit("error", {
    //         message: "Missing required fields",
    //       });
    //       return;
    //     }

    //     // Create order
    //     const newOrder = new Customer({
    //       username,
    //       tableNumber,
    //       customerName,
    //       phoneNumber: orderData.phoneNumber || "",
    //       description: orderData.description || "",
    //       items,
    //       grandTotal,
    //       status: "pending",
    //     });

    //     // await newOrder.save();

    //     // Invalidate cache
    //     await deleteCachePattern(`orders:${username}:*`);
    //     await deleteCachePattern(`stats:${username}:*`);

    //     // Emit to restaurant
    //     const restaurantRoom = `restaurant:${username}`;
    //     io.to(restaurantRoom).emit("order:created", {
    //       type: "created",
    //       order: newOrder.toObject(),
    //       timestamp: Date.now(),
    //     });

    //     // Confirm to customer
    //     socket.emit("order:created:success", {
    //       message: "Order created successfully",
    //       orderId: newOrder._id,
    //       order: newOrder.toObject(),
    //     });

    //     console.log(`✅ Order ${newOrder._id} created and broadcasted`);
    //   } catch (error) {
    //     console.error("❌ Error creating order:", error);
    //     socket.emit("error", {
    //       message: "Failed to create order",
    //       error: error.message,
    //     });
    //   }
    // });



    socket.on("customer:order:create", async ({ order }) => {
  try {
    if (!order || !order._id || !order.username) {
      socket.emit("error", { message: "Invalid order payload" });
      return;
    }

    const username = order.username;

    // Invalidate cache
    await deleteCachePattern(`orders:${username}:*`);
    await deleteCachePattern(`stats:${username}:*`);

    // Emit to restaurant
    const restaurantRoom = `restaurant:${username}`;
    io.to(restaurantRoom).emit("order:created", {
      type: "created",
      order,
      timestamp: Date.now(),
    });

    socket.emit("order:created:success", {
      message: "Order broadcasted",
      orderId: order._id,
    });

    console.log(`✅ Order ${order._id} broadcasted`);
  } catch (error) {
    socket.emit("error", {
      message: "Failed to broadcast order",
      error: error.message,
    });
  }
});



    // ===============================
    // CUSTOMER CANCELS ORDER
    // ===============================
    socket.on("customer:order:cancel", async ({ orderId }) => {
      try {
        const order = await Customer.findByIdAndUpdate(
          orderId,
          { status: "cancelled" },
          { new: true }
        );

        if (!order) {
          socket.emit("error", { message: "Order not found" });
          return;
        }

        // Invalidate cache
        await deleteCachePattern(`orders:${order.username}:*`);
        await deleteCachePattern(`stats:${order.username}:*`);

        // Emit to restaurant
        const restaurantRoom = `restaurant:${order.username}`;
        io.to(restaurantRoom).emit("order:updated", {
          type: "updated",
          order: order.toObject(),
          timestamp: Date.now(),
        });

        socket.emit("order:cancelled:success", {
          message: "Order cancelled",
          orderId: order._id,
        });

        console.log(`✅ Order ${orderId} cancelled`);
      } catch (error) {
        console.error("❌ Error cancelling order:", error);
        socket.emit("error", {
          message: "Failed to cancel order",
          error: error.message,
        });
      }
    });
  });

  console.log("🌉 Order Events Bridge initialized");
};




