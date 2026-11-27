const config = require("../config/env");
function trustedOrigin(req, res, next) {
  const origin = req.get("origin");
  if (origin && !config.clientOrigins.includes(origin)) {
    return res.status(403).json({ success: false, message: "Request origin is not allowed", data: null, errors: [] });
  }
  if (["/refresh", "/logout"].includes(req.path) && req.get("x-csrf-protection") !== "1") {
    return res.status(403).json({ success: false, message: "CSRF protection header is required", data: null, errors: [] });
  }
  return next();
}
module.exports = trustedOrigin;
