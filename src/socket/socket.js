// module.exports = function initSocket(io) {
//   io.on("connection", (socket) => {
//     socket.on("join-restaurant", (username) => {
//       socket.join(username);
//     });
//   });
// };


module.exports = function initSocket(io) {
  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("join-public-restaurant", (username) => {
      const room = `public:restaurant:${username}`;
      socket.join(room);
      console.log(`🌍 Joined public room: ${room}`);
    });

    socket.on("join-restaurant", (username) => {
      const room = `restaurant:${username}`;
      socket.join(room);
      console.log(`🔐 Joined restaurant room: ${room}`);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected:", socket.id);
    });
  });
};
