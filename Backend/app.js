const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors");

const app = express();

// Middleware
const allowedOrigins = new Set(
  [
    process.env.CORS_ORIGIN,
    "https://sisurat-gmit-yegar-sahaduta-bello.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
  ].filter(Boolean),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.has(origin) ||
        /^https:\/\/[\w-]+\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "50mb" })); // Increased limit for file uploads (base64)

// Basic error handler for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON" });
  }
  next();
});

// Routes (Placeholder)
app.get("/", (req, res) => {
  res.json({ message: "GMIT Yegar API is running" });
});

// Define Routes here
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/pengajuan", require("./routes/pengajuanRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/auth", require("./routes/googleAuthRoutes"));

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

module.exports = app;
