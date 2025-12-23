const jwt = require("jsonwebtoken");

/**
 * Socket.IO Handler for Real-time Order Updates
 */
module.exports = (io) => {
  // ===============================
  // AUTH MIDDLEWARE
  // ===============================
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        socket.authenticated = false;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      socket.authenticated = true;
      next();
    } catch (error) {
      console.error("Socket auth error:", error.message);
      socket.authenticated = false;
      next();
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ===============================
    // JOIN RESTAURANT ROOM
    // ===============================
    socket.on("join:restaurant", (username) => {
      if (!username) {
        socket.emit("error", { message: "Username is required" });
        return;
      }

      const room = `restaurant:${username}`;
      socket.join(room);

      console.log(`✅ Socket ${socket.id} joined room: ${room}`);

      socket.emit("joined", {
        room,
        message: `Joined restaurant ${username}`,
      });
    });

    // ===============================
    // LEAVE RESTAURANT ROOM
    // ===============================
    socket.on("leave:restaurant", (username) => {
      if (!username) return;

      const room = `restaurant:${username}`;
      socket.leave(room);

      console.log(`👋 Socket ${socket.id} left room: ${room}`);
    });

    // ===============================
    // PING / PONG
    // ===============================
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });

    // ===============================
    // DISCONNECT
    // ===============================
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} - ${reason}`);
    });

    // ===============================
    // ERROR
    // ===============================
    socket.on("error", (error) => {
      console.error(`❌ Socket error: ${socket.id}`, error);
    });
  });

  return io;
};
