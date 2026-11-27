const jwt = require("jsonwebtoken");
const User = require("../models/User");
const config = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");
const authenticate = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Authentication required", data: null, errors: [] });
  }
  let payload;
  try {
    payload = jwt.verify(token, config.JWT_ACCESS_SECRET, { issuer: "zeerostock-api", audience: "zeerostock-client" });
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired access token", data: null, errors: [] });
  }
  if (payload.type !== "access") {
    return res.status(401).json({ success: false, message: "Invalid access token", data: null, errors: [] });
  }
  const user = await User.findOne({ _id: payload.sub, isBlocked: false, deletedAt: null });
  if (!user) return res.status(401).json({ success: false, message: "Account is unavailable", data: null, errors: [] });
  req.user = user;
  next();
});
module.exports = authenticate;
