require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connectDatabase = require("./config/db");
const authRoutes = require("./routes/auth");
const portalRoutes = require("./routes/portal");
const publicRoutes = require("./routes/public");
const { notFound, errorHandler } = require("./middleware/errors");

const app = express();
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set to a random value of at least 32 characters");
}
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((origin) => origin.trim());
function isSameOrigin(origin, req) {
  try {
    return new URL(origin).host === (req.headers["x-forwarded-host"] || req.headers.host);
  } catch {
    return false;
  }
}
app.use(cors((req, callback) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin) || isSameOrigin(origin, req)) {
    return callback(null, { origin: true });
  }
  return callback(new Error("Origin is not allowed by CORS"));
}));
app.use(express.json({ limit: "1mb" }));
app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }), authRoutes);
app.use("/api/public/contact", rateLimit({ windowMs: 15 * 60 * 1000, limit: 5 }));
app.use("/api/public", publicRoutes);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", portalRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;

if (require.main === module) {
  const port = Number(process.env.PORT || 5000);
  connectDatabase()
    .then(() => app.listen(port, () => console.log(`Alumni Connect API listening on ${port}`)))
    .catch((error) => {
      console.error("Could not start API:", error.message);
      process.exitCode = 1;
    });
}
