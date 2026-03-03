/**
 * Backend entrypoint.
 * Responsibilities:
 * - load environment values
 * - configure security and parsing middleware
 * - register route modules
 * - expose health endpoints
 * - centralize error handling and process-level crash behavior
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const cors = require("cors");
const cookieParser = require("cookie-parser");
const express = require("express");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const protectedRoutes = require("./routes/protectedRoutes");
const { ensureRequiredEnv } = require("./utils/env");

// Fail fast on missing critical secrets/config.
ensureRequiredEnv();

const app = express();

// CORS allowlist can be supplied via CORS_ORIGIN=origin1,origin2,...
// Defaults keep local frontend development working out of the box.
const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const corsError = new Error("Origin is not allowed by CORS policy");
      corsError.statusCode = 403;
      return callback(corsError);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Lightweight root route used by frontend sanity checks.
app.get("/", (req, res) => {
  res.json({ success: true, message: "Backend is running." });
});

// Health probe route for local/hosting liveness checks.
app.get("/health", (req, res) => {
  res.json({ success: true, message: "OK" });
});

// Auth module routes.
app.use("/auth", authRoutes);
app.use("/api", protectedRoutes);

// Always keep error middleware as the last registered handlers.
app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });

  // Ensure rejected promises do not leave the process in an unknown state.
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    server.close(() => process.exit(1));
  });

  // Crash safely on unexpected exceptions.
  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    server.close(() => process.exit(1));
  });
}

// Exported for testing and controlled bootstrapping.
module.exports = app;
