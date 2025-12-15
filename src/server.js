require("dotenv").config();

// ======================
// DEBUG ENVIRONMENT VARIABLES
// ======================
// console.log("=== ENV DEBUG START ===");
// console.log("MONGO_URL:", process.env.MONGO_URL);
// console.log("R2_BUCKET:", process.env.R2_BUCKET);
// console.log("R2_ACCOUNT_ID:", process.env.R2_ACCOUNT_ID);
// console.log("R2_PUBLIC_URL:", process.env.R2_PUBLIC_URL);
// console.log("=== ENV DEBUG END ===");
if (process.env.NODE_ENV !== "production") {
  console.log("ENV loaded");
}

// ======================
// IMPORTS
// ======================
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const orderEventsBridge = require("./config/orderEventsBridge.js");


const http = require("http");
const { Server } = require("socket.io");

// ROUTES
const authRoutes = require("./routes/auth.routes.js");
const menuRoutes = require("./routes/menuRoutes.js");
const dishRoutes = require("./routes/dishRoutes.js");
const orderRoutes = require("./routes/orderRoutes.js");
const restaurantRoutes = require("./routes/restaurant.routes.js");
const feedbackRoutes = require("./routes/feedback.routes.js");
const arStatsRoutes = require("./routes/arStats.routes.js");
// MIDDLEWARES
const errorMiddleware = require("./middlewares/error.js");

// SOCKET HANDLER
const socketHandler = require("./config/socket.js");

// ======================
// EXPRESS APP
// ======================
const app = express();

// ======================
// CORS CONFIG
// ======================
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

// ======================
// GLOBAL MIDDLEWARES
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ======================
// REQUEST LOGGER (SAFE FOR PROD)
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
    autoIndex: true,
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
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },
  transports: ["websocket", "polling"], // 🔥 fast & stable
});

// 🔥 MAKE SOCKET AVAILABLE EVERYWHERE
app.use((req, res, next) => {
  req.io = io;
  next();
});

// INIT SOCKET HANDLER
socketHandler(io);
orderEventsBridge(io);


// ======================
// ROUTES
// ======================

// AUTH
app.use("/api/auth", authRoutes);

// RESTAURANT PROFILE / DASHBOARD
app.use("/api/v1/restaurant", restaurantRoutes);

// MENU
app.use("/api/v1", menuRoutes);

// DISH
app.use("/api/v1", dishRoutes);

// ORDER MANAGEMENT (CUSTOMERS COLLECTION)
app.use("/api/v1", orderRoutes);


// ANALYTICS & FEEDBACK
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

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
