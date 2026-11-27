const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const config = require("./config/env");
const logger = require("./utils/logger");
const authRoutes = require("./routes/authRoutes");
const inventoryV2Routes = require("./routes/inventoryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const reportRoutes = require("./routes/reportRoutes");
const inventoryRoutes = require("../routes/inventoryRoutes");
const supplierRoutes = require("../routes/supplierRoutes");
const authenticate = require("./middleware/authenticate");
const authorize = require("./middleware/authorize");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const app = express();

app.disable("x-powered-by");
app.set("trust proxy", config.isProduction ? 1 : false);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
    const error = new Error("Origin is not allowed by CORS");
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Protection"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(morgan("combined", { stream: { write: (message) => logger.http(message.trim()) } }));

app.get("/", (req, res) => res.status(200).json({
  success: true, message: "Zeerostock API is running", data: { environment: config.NODE_ENV }, errors: [],
}));
app.get("/health", (req, res) => res.status(200).json({
  success: true, message: "Service healthy", data: { status: "ok" }, errors: [],
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts. Try again later.", data: null, errors: [] },
});
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/v2/inventory", authenticate, (req, res, next) => authorize("admin", "manager")(req, res, next), inventoryV2Routes);
app.use("/api/v2/dashboard", authenticate, (req, res, next) => authorize("admin", "manager")(req, res, next), dashboardRoutes);
app.use("/api/v2/purchase-orders", authenticate, (req, res, next) => authorize("admin", "manager")(req, res, next), purchaseOrderRoutes);
app.use("/api/v2/reports", authenticate, (req, res, next) => authorize("admin", "manager")(req, res, next), reportRoutes);

const protectInventoryWrites = (req, res, next) => {
  if (req.method === "GET") return next();
  return authenticate(req, res, (error) => {
    if (error) return next(error);
    return authorize("admin", "manager")(req, res, next);
  });
};
app.use("/inventory", protectInventoryWrites, inventoryRoutes);
app.use("/supplier", authenticate, (req, res, next) => authorize("admin", "manager")(req, res, next), supplierRoutes);
app.use("/api/inventory", protectInventoryWrites, inventoryRoutes);
app.use("/api/suppliers", authenticate, (req, res, next) => authorize("admin", "manager")(req, res, next), supplierRoutes);

app.use(notFound);
app.use(errorHandler);
module.exports = app;
