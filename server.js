// server.js
// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED BACKEND ENTRY POINT
// Combines: auth + modules/student + modules/faculty
// ═══════════════════════════════════════════════════════════════════════════

require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const path    = require("path");

const connectDB = require("./core/db/connect");

// ── Module Routers ─────────────────────────────────────────────────────────
// 1. Shared Auth
const authRouter = require("./auth/routes/auth.routes");

// 2. Student Module (consolidated from naac-backend-main)
const studentProfileRouter = require("./modules/student/routes/studentProfile.routes");
const studentAuthRouter    = require("./modules/student/routes/auth.routes");
const privilegeRouter      = require("./modules/student/routes/RequestAccess.routes");
const searchRouter         = require("./modules/student/routes/search.route");

// 3. Faculty Module (consolidated from ProfCV-main)
const facultyProfileRouter = require("./modules/faculty/server/routes/profile");
const facultyAuthRouter    = require("./modules/faculty/server/routes/auth");
const directoryRouter      = require("./modules/faculty/server/routes/directory");

const app = express();

// ── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://profcv-kuc.netlify.app",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : []),
]);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static uploads (centralized) ───────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Legacy path compatibility
app.use("/api/faculty/uploads", express.static(path.join(__dirname, "uploads/faculty")));
app.use("/api/student/uploads", express.static(path.join(__dirname, "uploads/student")));

// ── Request Logger ─────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  next();
});

// ── Route Mounting ─────────────────────────────────────────────────────────
// A. Centralized Auth (Canonical)
app.use("/api/auth", authRouter);

// B. Student Module
app.use("/api/student/auth", studentAuthRouter); // Legacy/OTP support
app.use("/api/student", studentProfileRouter);
app.use("/api/privilege", privilegeRouter);
app.use("/api/search", searchRouter);

// C. Faculty Module
app.use("/api/faculty/auth", facultyAuthRouter); // Legacy support
app.use("/api/faculty", facultyProfileRouter);
app.use("/api/directory", directoryRouter);

// ── Health Check ───────────────────────────────────────────────────────────
const mongoose = require("mongoose");
const mongoStateLabel = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };

app.get("/api/health", (_req, res) => {
  const dbState = mongoStateLabel[mongoose.connection.readyState] || "unknown";
  return res.json({ status: "ok", dbState, timestamp: new Date().toISOString() });
});

// ── Root Probe ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  return res.status(200).json({
    message: "Unified Modular Backend is running.",
    version: "2.0.0-phase4",
    status: "Consolidated",
    modules: ["auth", "student", "faculty"],
  });
});

// ── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  return res.status(404).json({ message: "Route not found." });
});

// ── Global Error Handler ───────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[GlobalError]", err.message);
  if (err.message && err.message.startsWith("Not allowed by CORS")) {
    return res.status(403).json({ message: err.message });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File too large. Maximum 5 MB allowed." });
  }
  return res.status(500).json({ message: err.message || "Internal server error." });
});

// ── Process Safety ─────────────────────────────────────────────────────────
process.on("uncaughtException", (err)  => console.error("[Process] uncaughtException", err));
process.on("unhandledRejection", (err) => console.error("[Process] unhandledRejection", err));

// ── Bootstrap ──────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4000;
const HOST = "0.0.0.0";

connectDB().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Unified Modular Backend running on http://${HOST}:${PORT}`);
    console.log(`   Modules loaded: [auth, student, faculty]`);
  });
});
