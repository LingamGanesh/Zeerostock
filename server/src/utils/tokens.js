const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), type: "access" }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.ACCESS_TOKEN_EXPIRES_IN, issuer: "zeerostock-api", audience: "zeerostock-client",
  });
}
function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString(), type: "refresh" }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.REFRESH_TOKEN_EXPIRES_IN, issuer: "zeerostock-api", audience: "zeerostock-client",
  });
}
function hashToken(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
function getRefreshCookieOptions() {
  return { httpOnly: true, secure: config.isProduction, sameSite: config.isProduction ? "none" : "lax",
    path: "/api/auth", maxAge: 7 * 24 * 60 * 60 * 1000 };
}
module.exports = { signAccessToken, signRefreshToken, hashToken, getRefreshCookieOptions };
