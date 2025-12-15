module.exports = function initSocket(io) {
  io.on("connection", (socket) => {
    socket.on("join-restaurant", (username) => {
      socket.join(username);
    });
  });
};
