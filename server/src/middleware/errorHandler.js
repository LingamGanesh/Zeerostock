const logger = require("../utils/logger");
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  logger.error("Request failed", { message: error.message, stack: error.stack, method: req.method, path: req.originalUrl });
  if (error.name === "ValidationError") return res.status(400).json({
    success: false, message: "Database validation failed", data: null,
    errors: Object.values(error.errors).map((item) => ({ field: item.path, message: item.message })),
  });
  if (error.name === "CastError") return res.status(400).json({ success: false, message: "Invalid resource identifier", data: null, errors: [] });
  if (error.code === 11000) return res.status(409).json({ success: false, message: "A record with this value already exists", data: null, errors: [] });
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  return res.status(statusCode).json({ success: false, message: statusCode >= 500 ? "Internal server error" : error.message,
    data: null, errors: error.errors || [] });
}
module.exports = errorHandler;
