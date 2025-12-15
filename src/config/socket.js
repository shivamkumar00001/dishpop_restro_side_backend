// src/config/socket.js
module.exports = function socketHandler(io) {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // ✅ Restaurant dashboard joins using username
    socket.on("join-restaurant", (username) => {
      if (!username) return;

      socket.join(username);
      console.log(`🍽️ Socket ${socket.id} joined restaurant room: ${username}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
