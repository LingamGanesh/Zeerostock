const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const config = require("../config/env");
const { signAccessToken, signRefreshToken, hashToken } = require("../utils/tokens");
function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, isEmailVerified: user.isEmailVerified };
}
async function issueSession(user, req) {
  const refreshToken = signRefreshToken(user);
  const decoded = jwt.decode(refreshToken);
  await RefreshToken.create({ user: user._id, tokenHash: hashToken(refreshToken), expiresAt: new Date(decoded.exp * 1000),
    userAgent: req.get("user-agent") || "", ipAddress: req.ip });
  return { accessToken: signAccessToken(user), refreshToken, user: publicUser(user) };
}
async function register(input, req) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) { const error = new Error("An account with this email already exists"); error.statusCode = 409; throw error; }
  const user = await User.create({ name: input.name, email: input.email, password: input.password });
  return issueSession(user, req);
}
async function login(input, req) {
  const user = await User.findOne({ email: input.email.toLowerCase(), deletedAt: null }).select("+password");
  if (!user || !(await user.comparePassword(input.password))) {
    const error = new Error("Invalid email or password"); error.statusCode = 401; throw error;
  }
  if (user.isBlocked) { const error = new Error("This account has been blocked"); error.statusCode = 403; throw error; }
  return issueSession(user, req);
}
async function refresh(rawToken, req) {
  if (!rawToken) { const error = new Error("Refresh session is missing"); error.statusCode = 401; throw error; }
  let payload;
  try {
    payload = jwt.verify(rawToken, config.JWT_REFRESH_SECRET, { issuer: "zeerostock-api", audience: "zeerostock-client" });
  } catch { const error = new Error("Refresh session is invalid or expired"); error.statusCode = 401; throw error; }
  if (payload.type !== "refresh") { const error = new Error("Invalid refresh token"); error.statusCode = 401; throw error; }
  const oldHash = hashToken(rawToken);
  // Claim the old session atomically so two simultaneous refreshes cannot both rotate it.
  const stored = await RefreshToken.findOneAndUpdate(
    { tokenHash: oldHash, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } },
    { new: true }
  ).select("+tokenHash");
  if (!stored) { const error = new Error("Refresh session is no longer valid"); error.statusCode = 401; throw error; }
  const user = await User.findOne({ _id: payload.sub, isBlocked: false, deletedAt: null });
  if (!user) { const error = new Error("Account is unavailable"); error.statusCode = 401; throw error; }
  const nextSession = await issueSession(user, req);
  stored.replacedByTokenHash = hashToken(nextSession.refreshToken);
  await stored.save();
  return nextSession;
}
async function logout(rawToken) {
  if (rawToken) await RefreshToken.updateOne({ tokenHash: hashToken(rawToken), revokedAt: null }, { $set: { revokedAt: new Date() } });
}
module.exports = { register, login, refresh, logout, publicUser };
