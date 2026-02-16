// // // ============================================================
// // // FILE PATH: src/config/orderEventsBridge.js (RESTAURANT BACKEND)
// // // DESCRIPTION: Listen to customer orders and broadcast to restaurant dashboard
// // // IMPORTANT: Does NOT create orders - only broadcasts existing ones
// // // ============================================================

// // const Customer = require("../models/customers");
// // const { deleteCachePattern } = require("./redis");

// // /**
// //  * Order Events Bridge
// //  * Receives order notifications from customer backend
// //  * Broadcasts to restaurant dashboard for real-time updates
// //  * 
// //  * ⚠️ IMPORTANT: This does NOT create orders in database
// //  * Orders are already created by customer backend
// //  */
// // module.exports = (io) => {
// //   io.on("connection", (socket) => {
// //     console.log("🔌 New socket connection:", socket.id);

// //     // ===============================
// //     // CUSTOMER ORDER NOTIFICATION
// //     // ===============================
// //     socket.on("customer:order:create", async (orderData) => {
// //       try {
// //         console.log("📦 Order notification received:", orderData);

// //         const { orderId, username } = orderData;

// //         // Validation
// //         if (!orderId || !username) {
// //           socket.emit("error", {
// //             message: "Missing orderId or username",
// //           });
// //           return;
// //         }

// //         // ✅ FETCH existing order (created by customer backend)
// //         const order = await Customer.findById(orderId).lean();

// //         if (!order) {
// //           socket.emit("error", {
// //             message: "Order not found in database",
// //           });
// //           return;
// //         }

// //         // Invalidate cache for fresh data
// //         await deleteCachePattern(`orders:${username}:*`);
// //         await deleteCachePattern(`stats:${username}:*`);

// //         // 📡 Broadcast to restaurant dashboard
// //         const restaurantRoom = `restaurant:${username}`;
// //         io.to(restaurantRoom).emit("order:created", {
// //           type: "created",
// //           order: order,
// //           timestamp: Date.now(),
// //         });

// //         // Confirm to customer backend
// //         socket.emit("order:created:success", {
// //           message: "Order notification broadcasted successfully",
// //           orderId: order._id,
// //         });

// //         console.log(`✅ Order ${order._id} broadcasted to restaurant dashboard`);
// //       } catch (error) {
// //         console.error("❌ Error processing order notification:", error);
// //         socket.emit("error", {
// //           message: "Failed to process order notification",
// //           error: error.message,
// //         });
// //       }
// //     });

// //     // ===============================
// //     // CUSTOMER CANCELS ORDER
// //     // ===============================
// //     socket.on("customer:order:cancel", async ({ orderId }) => {
// //       try {
// //         console.log("🚫 Order cancellation request:", orderId);

// //         const order = await Customer.findByIdAndUpdate(
// //           orderId,
// //           { status: "cancelled" },
// //           { new: true }
// //         );

// //         if (!order) {
// //           socket.emit("error", { message: "Order not found" });
// //           return;
// //         }

// //         // Invalidate cache
// //         await deleteCachePattern(`orders:${order.username}:*`);
// //         await deleteCachePattern(`stats:${order.username}:*`);

// //         // 📡 Broadcast update to restaurant dashboard
// //         const restaurantRoom = `restaurant:${order.username}`;
// //         io.to(restaurantRoom).emit("order:updated", {
// //           type: "updated",
// //           order: order.toObject(),
// //           timestamp: Date.now(),
// //         });

// //         socket.emit("order:cancelled:success", {
// //           message: "Order cancelled successfully",
// //           orderId: order._id,
// //         });

// //         console.log(`✅ Order ${orderId} cancelled and broadcasted`);
// //       } catch (error) {
// //         console.error("❌ Error cancelling order:", error);
// //         socket.emit("error", {
// //           message: "Failed to cancel order",
// //           error: error.message,
// //         });
// //       }
// //     });

// //     // ===============================
// //     // RESTAURANT UPDATES ORDER STATUS
// //     // ===============================
// //     socket.on("restaurant:order:update", async ({ orderId, status }) => {
// //       try {
// //         console.log(`📝 Order status update: ${orderId} -> ${status}`);

// //         const order = await Customer.findByIdAndUpdate(
// //           orderId,
// //           { status },
// //           { new: true }
// //         );

// //         if (!order) {
// //           socket.emit("error", { message: "Order not found" });
// //           return;
// //         }

// //         // Invalidate cache
// //         await deleteCachePattern(`orders:${order.username}:*`);
// //         await deleteCachePattern(`stats:${order.username}:*`);

// //         // 📡 Broadcast to all connected clients (dashboard)
// //         const restaurantRoom = `restaurant:${order.username}`;
// //         io.to(restaurantRoom).emit("order:updated", {
// //           type: "updated",
// //           order: order.toObject(),
// //           timestamp: Date.now(),
// //         });

// //         socket.emit("order:updated:success", {
// //           message: "Order status updated successfully",
// //           orderId: order._id,
// //           status: order.status,
// //         });

// //         console.log(`✅ Order ${orderId} status updated to ${status}`);
// //       } catch (error) {
// //         console.error("❌ Error updating order:", error);
// //         socket.emit("error", {
// //           message: "Failed to update order",
// //           error: error.message,
// //         });
// //       }
// //     });

// //     // ===============================
// //     // JOIN RESTAURANT ROOM
// //     // ===============================
// //     socket.on("restaurant:join", ({ username }) => {
// //       const restaurantRoom = `restaurant:${username}`;
// //       socket.join(restaurantRoom);
// //       console.log(`🏠 Restaurant ${username} joined room ${restaurantRoom}`);
      
// //       socket.emit("restaurant:joined", {
// //         message: `Joined restaurant room: ${restaurantRoom}`,
// //         room: restaurantRoom,
// //       });
// //     });

// //     // ===============================
// //     // DISCONNECT
// //     // ===============================
// //     socket.on("disconnect", () => {
// //       console.log("🔌 Socket disconnected:", socket.id);
// //     });
// //   });

// //   console.log("🌉 Order Events Bridge initialized (No duplicate creation)");
// // };



// // // ============================================================
// // // FILE PATH: src/config/orderEventsBridge.js (RESTAURANT BACKEND)
// // // DESCRIPTION: Listen to customer orders and broadcast to restaurant dashboard
// // // IMPORTANT: Does NOT create orders - only broadcasts existing ones
// // // ============================================================

// // const Customer = require("../models/customers");
// // const { deleteCachePattern } = require("./redis");

// // /**
// //  * Order Events Bridge
// //  * Receives order notifications from customer backend
// //  * Broadcasts to restaurant dashboard + public user pages for real-time updates
// //  *
// //  * ⚠️ IMPORTANT: This does NOT create orders in database
// //  * Orders are already created by customer backend
// //  */
// // module.exports = (io) => {
// //   io.on("connection", (socket) => {
// //     console.log("🔌 New socket connection:", socket.id);

// //     // ===============================
// //     // CUSTOMER ORDER NOTIFICATION
// //     // ===============================
// //     socket.on("customer:order:create", async (orderData) => {
// //       try {
// //         console.log("📦 Order notification received:", orderData);

// //         const { orderId, username } = orderData;

// //         // Validation
// //         if (!orderId || !username) {
// //           socket.emit("error", {
// //             message: "Missing orderId or username",
// //           });
// //           return;
// //         }

// //         // ✅ FETCH existing order (created by customer backend)
// //         const order = await Customer.findById(orderId).lean();

// //         if (!order) {
// //           socket.emit("error", {
// //             message: "Order not found in database",
// //           });
// //           return;
// //         }

// //         // Invalidate cache for fresh data
// //         await deleteCachePattern(`orders:${username}:*`);
// //         await deleteCachePattern(`stats:${username}:*`);

// //         const payload = {
// //           type: "created",
// //           order,
// //           timestamp: Date.now(),
// //         };

// //         // 🔐 Restaurant dashboard
// //         io.to(`restaurant:${username}`).emit("order:created", payload);

// //         // 🌍 Public user order-status page
// //         io.to(`public:restaurant:${username}`).emit("order:created", payload);

// //         // Confirm to customer backend
// //         socket.emit("order:created:success", {
// //           message: "Order notification broadcasted successfully",
// //           orderId: order._id,
// //         });

// //         console.log(`✅ Order ${order._id} broadcasted to restaurant + public users`);
// //       } catch (error) {
// //         console.error("❌ Error processing order notification:", error);
// //         socket.emit("error", {
// //           message: "Failed to process order notification",
// //           error: error.message,
// //         });
// //       }
// //     });

// //     // ===============================
// //     // CUSTOMER CANCELS ORDER
// //     // ===============================
// //     socket.on("customer:order:cancel", async ({ orderId }) => {
// //       try {
// //         console.log("🚫 Order cancellation request:", orderId);

// //         const order = await Customer.findByIdAndUpdate(
// //           orderId,
// //           { status: "cancelled" },
// //           { new: true }
// //         );

// //         if (!order) {
// //           socket.emit("error", { message: "Order not found" });
// //           return;
// //         }

// //         // Invalidate cache
// //         await deleteCachePattern(`orders:${order.username}:*`);
// //         await deleteCachePattern(`stats:${order.username}:*`);

// //         const payload = {
// //           type: "updated",
// //           order: order.toObject(),
// //           timestamp: Date.now(),
// //         };

// //         // 🔐 Restaurant dashboard
// //         io.to(`restaurant:${order.username}`).emit("order:updated", payload);

// //         // 🌍 Public users
// //         io.to(`public:restaurant:${order.username}`).emit("order:updated", payload);

// //         socket.emit("order:cancelled:success", {
// //           message: "Order cancelled successfully",
// //           orderId: order._id,
// //         });

// //         console.log(`✅ Order ${orderId} cancelled and broadcasted`);
// //       } catch (error) {
// //         console.error("❌ Error cancelling order:", error);
// //         socket.emit("error", {
// //           message: "Failed to cancel order",
// //           error: error.message,
// //         });
// //       }
// //     });

// //     // ===============================
// //     // RESTAURANT UPDATES ORDER STATUS
// //     // ===============================
// //     socket.on("restaurant:order:update", async ({ orderId, status }) => {
// //       try {
// //         console.log(`📝 Order status update: ${orderId} -> ${status}`);

// //         const order = await Customer.findByIdAndUpdate(
// //           orderId,
// //           { status },
// //           { new: true }
// //         );

// //         if (!order) {
// //           socket.emit("error", { message: "Order not found" });
// //           return;
// //         }

// //         // Invalidate cache
// //         await deleteCachePattern(`orders:${order.username}:*`);
// //         await deleteCachePattern(`stats:${order.username}:*`);

// //         const payload = {
// //           type: "updated",
// //           order: order.toObject(),
// //           timestamp: Date.now(),
// //         };

// //         // 🔐 Restaurant dashboard
// //         io.to(`restaurant:${order.username}`).emit("order:updated", payload);

// //         // 🌍 Public users
// //         io.to(`public:restaurant:${order.username}`).emit("order:updated", payload);

// //         socket.emit("order:updated:success", {
// //           message: "Order status updated successfully",
// //           orderId: order._id,
// //           status: order.status,
// //         });

// //         console.log(`✅ Order ${orderId} status updated to ${status}`);
// //       } catch (error) {
// //         console.error("❌ Error updating order:", error);
// //         socket.emit("error", {
// //           message: "Failed to update order",
// //           error: error.message,
// //         });
// //       }
// //     });

// //     // ===============================
// //     // JOIN RESTAURANT ROOM (OPTIONAL / LEGACY)
// //     // ===============================
// //     socket.on("restaurant:join", ({ username }) => {
// //       const restaurantRoom = `restaurant:${username}`;
// //       socket.join(restaurantRoom);
// //       console.log(`🏠 Restaurant ${username} joined room ${restaurantRoom}`);

// //       socket.emit("restaurant:joined", {
// //         message: `Joined restaurant room: ${restaurantRoom}`,
// //         room: restaurantRoom,
// //       });
// //     });

// //     // ===============================
// //     // DISCONNECT
// //     // ===============================
// //     socket.on("disconnect", () => {
// //       console.log("🔌 Socket disconnected:", socket.id);
// //     });
// //   });

// //   console.log("🌉 Order Events Bridge initialized (restaurant + public)");
// // };




// // ============================================================
// // FILE PATH: src/config/orderEventsBridge.js (RESTAURANT BACKEND)
// // DESCRIPTION: Listen to customer orders and broadcast to restaurant dashboard
// // IMPORTANT: Does NOT create orders - only broadcasts existing ones
// // ============================================================

// const Customer = require("../models/customers");
// const { deleteCachePattern } = require("./redis");

// /**
//  * Order Events Bridge
//  * Receives order notifications from customer backend
//  * Broadcasts to restaurant dashboard + public user pages for real-time updates
//  *
//  * ⚠️ IMPORTANT: This does NOT create orders in database
//  * Orders are already created by customer backend
//  */
// module.exports = (io) => {
//   io.on("connection", (socket) => {
//     console.log("🔌 New socket connection:", socket.id);

//     // 🔥🔥🔥 REQUIRED: PUBLIC USER ROOM JOIN 🔥🔥🔥
//     socket.on("join-public-restaurant", (username) => {
//       const publicRoom = `public:restaurant:${username}`;
//       socket.join(publicRoom);
//       console.log(`🌍 Public user joined room: ${publicRoom}`);

//       socket.emit("room-joined", {
//         room: publicRoom,
//       });
//     });

//     // ===============================
//     // CUSTOMER ORDER NOTIFICATION
//     // ===============================
//     socket.on("customer:order:create", async (orderData) => {
//       try {
//         console.log("📦 Order notification received:", orderData);

//         const { orderId, username } = orderData;

//         if (!orderId || !username) {
//           socket.emit("error", {
//             message: "Missing orderId or username",
//           });
//           return;
//         }

//         const order = await Customer.findById(orderId).lean();

//         if (!order) {
//           socket.emit("error", {
//             message: "Order not found in database",
//           });
//           return;
//         }

//         await deleteCachePattern(`orders:${username}:*`);
//         await deleteCachePattern(`stats:${username}:*`);

//         const payload = {
//           type: "created",
//           order,
//           timestamp: Date.now(),
//         };

//         // 🔐 Restaurant dashboard
//         io.to(`restaurant:${username}`).emit("order:created", payload);

//         // 🌍 Public user order-status page
//         io.to(`public:restaurant:${username}`).emit("order:created", payload);

//         socket.emit("order:created:success", {
//           message: "Order notification broadcasted successfully",
//           orderId: order._id,
//         });

//         console.log(`✅ Order ${order._id} broadcasted to restaurant + public users`);
//       } catch (error) {
//         console.error("❌ Error processing order notification:", error);
//         socket.emit("error", {
//           message: "Failed to process order notification",
//           error: error.message,
//         });
//       }
//     });

//     // ===============================
//     // CUSTOMER CANCELS ORDER
//     // ===============================
//     socket.on("customer:order:cancel", async ({ orderId }) => {
//       try {
//         console.log("🚫 Order cancellation request:", orderId);

//         const order = await Customer.findByIdAndUpdate(
//           orderId,
//           { status: "cancelled" },
//           { new: true }
//         );

//         if (!order) {
//           socket.emit("error", { message: "Order not found" });
//           return;
//         }

//         await deleteCachePattern(`orders:${order.username}:*`);
//         await deleteCachePattern(`stats:${order.username}:*`);

//         const payload = {
//           type: "updated",
//           order: order.toObject(),
//           timestamp: Date.now(),
//         };

//         io.to(`restaurant:${order.username}`).emit("order:updated", payload);
//         io.to(`public:restaurant:${order.username}`).emit("order:updated", payload);

//         socket.emit("order:cancelled:success", {
//           message: "Order cancelled successfully",
//           orderId: order._id,
//         });

//         console.log(`✅ Order ${orderId} cancelled and broadcasted`);
//       } catch (error) {
//         console.error("❌ Error cancelling order:", error);
//         socket.emit("error", {
//           message: "Failed to cancel order",
//           error: error.message,
//         });
//       }
//     });

//     // ===============================
//     // RESTAURANT UPDATES ORDER STATUS
//     // ===============================
//     socket.on("restaurant:order:update", async ({ orderId, status }) => {
//       try {
//         console.log(`📝 Order status update: ${orderId} -> ${status}`);

//         const order = await Customer.findByIdAndUpdate(
//           orderId,
//           { status },
//           { new: true }
//         );

//         if (!order) {
//           socket.emit("error", { message: "Order not found" });
//           return;
//         }

//         await deleteCachePattern(`orders:${order.username}:*`);
//         await deleteCachePattern(`stats:${order.username}:*`);

//         const payload = {
//           type: "updated",
//           order: order.toObject(),
//           timestamp: Date.now(),
//         };

//         io.to(`restaurant:${order.username}`).emit("order:updated", payload);
//         io.to(`public:restaurant:${order.username}`).emit("order:updated", payload);

//         socket.emit("order:updated:success", {
//           message: "Order status updated successfully",
//           orderId: order._id,
//           status: order.status,
//         });

//         console.log(`✅ Order ${orderId} status updated to ${status}`);
//       } catch (error) {
//         console.error("❌ Error updating order:", error);
//         socket.emit("error", {
//           message: "Failed to update order",
//           error: error.message,
//         });
//       }
//     });

//     // ===============================
//     // JOIN RESTAURANT ROOM (OPTIONAL / LEGACY)
//     // ===============================
//     socket.on("restaurant:join", ({ username }) => {
//       const restaurantRoom = `restaurant:${username}`;
//       socket.join(restaurantRoom);
//       console.log(`🏠 Restaurant ${username} joined room ${restaurantRoom}`);

//       socket.emit("restaurant:joined", {
//         message: `Joined restaurant room: ${restaurantRoom}`,
//         room: restaurantRoom,
//       });
//     });

//     // ===============================
//     // DISCONNECT
//     // ===============================
//     socket.on("disconnect", () => {
//       console.log("🔌 Socket disconnected:", socket.id);
//     });
//   });

//   console.log("🌉 Order Events Bridge initialized (restaurant + public)");
// };





// ============================================================
// FILE PATH: src/config/orderEventsBridge.js (RESTAURANT BACKEND)
// DESCRIPTION: Listen to customer orders and broadcast to restaurant dashboard
// IMPORTANT: Does NOT create orders - only broadcasts existing ones
// ============================================================

const Customer = require("../models/customers");
const { deleteCachePattern } = require("./redis");

/**
 * Order Events Bridge
 * Receives order notifications from customer backend
 * Broadcasts to restaurant dashboard + public user pages for real-time updates
 *
 * ⚠️ IMPORTANT: This does NOT create orders in database
 * Orders are already created by customer backend
 */
module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 New socket connection:", socket.id);

    // 🔥🔥🔥 REQUIRED: PUBLIC USER ROOM JOIN 🔥🔥🔥
    socket.on("join-public-restaurant", (username) => {
      const publicRoom = `public:restaurant:${username}`;
      socket.join(publicRoom);
      console.log(`🌍 Public user joined room: ${publicRoom}`);

      socket.emit("room-joined", {
        room: publicRoom,
      });
    });

    // ===============================
    // CUSTOMER ORDER NOTIFICATION
    // ===============================
    socket.on("customer:order:create", async (orderData) => {
      try {
        console.log("📦 Order notification received:", orderData);

        const { orderId, username } = orderData;

        if (!orderId || !username) {
          socket.emit("error", {
            message: "Missing orderId or username",
          });
          return;
        }

        const order = await Customer.findById(orderId).lean();

        if (!order) {
          socket.emit("error", {
            message: "Order not found in database",
          });
          return;
        }

        await deleteCachePattern(`orders:${username}:*`);
        await deleteCachePattern(`stats:${username}:*`);

        const payload = {
          type: "created",
          order,
          timestamp: Date.now(),
        };

        // 🔐 Restaurant dashboard
        io.to(`restaurant:${username}`).emit("order:created", payload);

        // 🌍 Public user order-status page
        io.to(`public:restaurant:${username}`).emit("order:created", payload);

        socket.emit("order:created:success", {
          message: "Order notification broadcasted successfully",
          orderId: order._id,
        });

        console.log(`✅ Order ${order._id} broadcasted to restaurant + public users`);
      } catch (error) {
        console.error("❌ Error processing order notification:", error);
        socket.emit("error", {
          message: "Failed to process order notification",
          error: error.message,
        });
      }
    });

    // ===============================
    // CUSTOMER CANCELS ORDER
    // ===============================
    socket.on("customer:order:cancel", async ({ orderId }) => {
      try {
        console.log("🚫 Order cancellation request:", orderId);

        const order = await Customer.findByIdAndUpdate(
          orderId,
          { status: "cancelled" },
          { new: true }
        );

        if (!order) {
          socket.emit("error", { message: "Order not found" });
          return;
        }

        await deleteCachePattern(`orders:${order.username}:*`);
        await deleteCachePattern(`stats:${order.username}:*`);

        const payload = {
          type: "updated",
          order: order.toObject(),
          timestamp: Date.now(),
        };

        io.to(`restaurant:${order.username}`).emit("order:updated", payload);
        io.to(`public:restaurant:${order.username}`).emit("order:updated", payload);

        socket.emit("order:cancelled:success", {
          message: "Order cancelled successfully",
          orderId: order._id,
        });

        console.log(`✅ Order ${orderId} cancelled and broadcasted`);
      } catch (error) {
        console.error("❌ Error cancelling order:", error);
        socket.emit("error", {
          message: "Failed to cancel order",
          error: error.message,
        });
      }
    });

    // ===============================
    // RESTAURANT UPDATES ORDER STATUS
    // ===============================
    socket.on("restaurant:order:update", async ({ orderId, status }) => {
      try {
        console.log(`📝 Order status update: ${orderId} -> ${status}`);

        const order = await Customer.findByIdAndUpdate(
          orderId,
          { status },
          { new: true }
        );

        if (!order) {
          socket.emit("error", { message: "Order not found" });
          return;
        }

        await deleteCachePattern(`orders:${order.username}:*`);
        await deleteCachePattern(`stats:${order.username}:*`);

        const payload = {
          type: "updated",
          order: order.toObject(),
          timestamp: Date.now(),
        };

        io.to(`restaurant:${order.username}`).emit("order:updated", payload);
        io.to(`public:restaurant:${order.username}`).emit("order:updated", payload);

        socket.emit("order:updated:success", {
          message: "Order status updated successfully",
          orderId: order._id,
          status: order.status,
        });

        console.log(`✅ Order ${orderId} status updated to ${status}`);
      } catch (error) {
        console.error("❌ Error updating order:", error);
        socket.emit("error", {
          message: "Failed to update order",
          error: error.message,
        });
      }
    });

    // ===============================
    // ASSIGN DELIVERY (ONLINE ORDERS ONLY)
    // ===============================
    socket.on("restaurant:order:assign-delivery", async ({ orderId, username, boyName, boyPhone }) => {
      try {
        console.log(`🚚 Delivery assignment request: ${orderId}`);

        if (!orderId || !username || !boyName || !boyPhone) {
          socket.emit("error", {
            message: "Missing required fields: orderId, username, boyName, boyPhone",
          });
          return;
        }

        const order = await Customer.findById(orderId);

        if (!order) {
          socket.emit("error", { message: "Order not found" });
          return;
        }

        if (order.orderType !== "ONLINE") {
          socket.emit("error", {
            message: "Delivery can only be assigned to ONLINE orders",
          });
          return;
        }

        order.delivery = {
          boyName,
          boyPhone,
          assignedAt: new Date(),
          status: "assigned",
        };

        await order.save();

        await deleteCachePattern(`orders:${username}:*`);
        await deleteCachePattern(`order:${orderId}`);

        const payload = {
          type: "updated",
          order: order.toObject(),
          timestamp: Date.now(),
        };

        io.to(`restaurant:${username}`).emit("order:updated", payload);
        io.to(`public:restaurant:${username}`).emit("order:updated", payload);

        socket.emit("delivery:assigned:success", {
          message: "Delivery assigned successfully",
          orderId: order._id,
          delivery: order.delivery,
        });

        console.log(`✅ Delivery assigned to ${boyName} for order ${orderId}`);
      } catch (error) {
        console.error("❌ Error assigning delivery:", error);
        socket.emit("error", {
          message: "Failed to assign delivery",
          error: error.message,
        });
      }
    });

    // ===============================
    // UPDATE DELIVERY STATUS (ONLINE ORDERS ONLY)
    // ===============================
    socket.on("restaurant:order:update-delivery-status", async ({ orderId, username, status }) => {
      try {
        console.log(`📦 Delivery status update: ${orderId} -> ${status}`);

        if (!orderId || !username || !status) {
          socket.emit("error", {
            message: "Missing required fields: orderId, username, status",
          });
          return;
        }

        const validStatuses = ["assigned", "out_for_delivery", "delivered"];
        if (!validStatuses.includes(status)) {
          socket.emit("error", {
            message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          });
          return;
        }

        const order = await Customer.findById(orderId);

        if (!order) {
          socket.emit("error", { message: "Order not found" });
          return;
        }

        if (order.orderType !== "ONLINE") {
          socket.emit("error", {
            message: "Delivery status can only be updated for ONLINE orders",
          });
          return;
        }

        if (!order.delivery || order.delivery.status === "not_assigned") {
          socket.emit("error", {
            message: "Delivery must be assigned before updating status",
          });
          return;
        }

        order.delivery.status = status;
        await order.save();

        await deleteCachePattern(`orders:${username}:*`);
        await deleteCachePattern(`order:${orderId}`);

        const payload = {
          type: "updated",
          order: order.toObject(),
          timestamp: Date.now(),
        };

        io.to(`restaurant:${username}`).emit("order:updated", payload);
        io.to(`public:restaurant:${username}`).emit("order:updated", payload);

        socket.emit("delivery:status:updated:success", {
          message: "Delivery status updated successfully",
          orderId: order._id,
          status: order.delivery.status,
        });

        console.log(`✅ Delivery status updated to ${status} for order ${orderId}`);
      } catch (error) {
        console.error("❌ Error updating delivery status:", error);
        socket.emit("error", {
          message: "Failed to update delivery status",
          error: error.message,
        });
      }
    });

    // ===============================
    // JOIN RESTAURANT ROOM (OPTIONAL / LEGACY)
    // ===============================
    socket.on("restaurant:join", ({ username }) => {
      const restaurantRoom = `restaurant:${username}`;
      socket.join(restaurantRoom);
      console.log(`🏠 Restaurant ${username} joined room ${restaurantRoom}`);

      socket.emit("restaurant:joined", {
        message: `Joined restaurant room: ${restaurantRoom}`,
        room: restaurantRoom,
      });
    });

    // ===============================
    // DISCONNECT
    // ===============================
    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected:", socket.id);
    });
  });

  console.log("🌉 Order Events Bridge initialized (restaurant + public)");
};







