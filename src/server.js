const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

 


// ======================
// BASIC ENV LOG
// ======================
if (process.env.NODE_ENV !== "production") {
  console.log("ENV loaded in development mode");
}

// ======================
// IMPORTS
// ======================
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");

const orderEventsBridge = require("./config/orderEventsBridge.js");
const socketHandler = require("./config/socket.js");

// ROUTES
const authRoutes = require("./routes/auth.routes.js");
const menuRoutes = require("./routes/menuRoutes.js");
const dishRoutes = require("./routes/dishRoutes.js");
const orderRoutes = require("./routes/orderRoutes.js");
const restaurantRoutes = require("./routes/restaurant.routes.js");
const feedbackRoutes = require("./routes/feedback.routes.js");
const arStatsRoutes = require("./routes/arStats.routes.js");

// MIDDLEWARE
const errorMiddleware = require("./middlewares/error.js");

// ======================
// EXPRESS APP
// ======================
const app = express();

// ======================
// CORS (FIXED FOR DEPLOYMENT)
// ======================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://dishpop-restro-side-frontend-cml9.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server, Postman, mobile apps
      if (!origin) return callback(null, true);

      if (
        origin === "http://localhost:5173" ||
        origin === "http://localhost:3000" ||
        origin === "https://dishpop-restro-side-frontend-cml9.vercel.app"
      ) {
        return callback(null, true);
      }

      // ❗ DO NOT throw error — silently block
      return callback(null, false);
    },
    credentials: true, // 🔥 REQUIRED for cookies
  })
);



// ======================
// GLOBAL MIDDLEWARES
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ======================
// DEV REQUEST LOGGER
// ======================
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.originalUrl}`);
    next();
  });
}

// ======================
// MONGO CONNECTION
// ======================
mongoose
  .connect(process.env.MONGO_URL, {
    autoIndex: process.env.NODE_ENV !== "production",
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ Mongo Connection Error:", err);
    process.exit(1);
  });

// ======================
// HTTP + SOCKET.IO
// ======================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Make socket available in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Init socket logic
socketHandler(io);
orderEventsBridge(io);

// ======================
// ROUTES
// ======================
app.use("/api/auth", authRoutes);
app.use("/api/v1/restaurant", restaurantRoutes);
app.use("/api/v1", menuRoutes);
app.use("/api/v1", dishRoutes);
app.use("/api/v1", orderRoutes);
app.use("/api/ar-stats", arStatsRoutes);
app.use("/api/feedback", feedbackRoutes);

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "restaurant-backend",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
  });
});

// ======================
// 404 HANDLER
// ======================
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ======================
// GLOBAL ERROR HANDLER
// ======================
app.use(errorMiddleware);

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ======================
// PROCESS SAFETY
// ======================
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
