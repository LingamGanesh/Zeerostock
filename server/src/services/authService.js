const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const config = require("../config/env");
const { signAccessToken, signRefreshToken, hashToken } = require("../utils/tokens");
const { sendEmail } = require("../utils/mailer");
const logger = require("../utils/logger");

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, isEmailVerified: user.isEmailVerified };
}
function httpError(message, statusCode) { const error = new Error(message); error.statusCode = statusCode; return error; }
async function issueSession(user, req) {
  const refreshToken = signRefreshToken(user);
  const decoded = jwt.decode(refreshToken);
  await RefreshToken.create({ user: user._id, tokenHash: hashToken(refreshToken), expiresAt: new Date(decoded.exp * 1000),
    userAgent: req.get("user-agent") || "", ipAddress: req.ip });
  return { accessToken: signAccessToken(user), refreshToken, user: publicUser(user) };
}
async function sendVerification(user) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationTokenHash = hashToken(rawToken);
  user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  const link = config.CLIENT_URL.split(",")[0].trim().replace(/\/$/, "") + "/?auth=verify-email&token=" + rawToken;
  await sendEmail({ to: user.email, subject: "Verify your Zeerostock email",
    text: "Hello " + user.name + ", verify your email using this link: " + link + ". This link expires in 24 hours.",
    html: "<p>Hello " + escapeHtml(user.name) + ",</p><p>Verify your Zeerostock email address:</p><p><a href=\"" + link + "\">Verify email address</a></p><p>This link expires in 24 hours.</p>" });
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }

async function register(input) {
  const email = input.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw httpError("An account with this email already exists", 409);
  const user = await User.create({ name: input.name, email, password: input.password });
  try { await sendVerification(user); }
  catch (error) {
    // Keep the account so the user can retry delivery through resend-verification.
    error.message = "Your account was created, but the verification email could not be sent. Use Resend verification to try again.";
    throw error;
  }
  return { email: user.email, emailVerificationRequired: true };
}
async function verifyEmail(rawToken) {
  if (!rawToken || typeof rawToken !== "string") throw httpError("Verification link is invalid or expired", 400);
  const user = await User.findOne({ emailVerificationTokenHash: hashToken(rawToken), emailVerificationExpiresAt: { $gt: new Date() }, deletedAt: null }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");
  if (!user) throw httpError("Verification link is invalid or expired", 400);
  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();
  return { email: user.email, isEmailVerified: true };
}
async function resendVerification(emailInput) {
  const user = await User.findOne({ email: emailInput.toLowerCase(), deletedAt: null });
  if (user && !user.isEmailVerified) {
    try { await sendVerification(user); }
    catch (error) { logger.warn("Verification email delivery failed", { message: error.message }); }
  }
  return { message: "If an unverified account exists for that email, a verification link has been sent." };
}
async function login(input, req) {
  const user = await User.findOne({ email: input.email.toLowerCase(), deletedAt: null }).select("+password");
  if (!user || !(await user.comparePassword(input.password))) throw httpError("Invalid email or password", 401);
  if (user.isBlocked) throw httpError("This account has been blocked", 403);
  if (!user.isEmailVerified) throw httpError("Please verify your email before signing in. You can resend the verification email.", 403);
  return issueSession(user, req);
}
async function refresh(rawToken, req) {
  if (!rawToken) throw httpError("Refresh session is missing", 401);
  let payload;
  try { payload = jwt.verify(rawToken, config.JWT_REFRESH_SECRET, { issuer: "zeerostock-api", audience: "zeerostock-client" }); }
  catch { throw httpError("Refresh session is invalid or expired", 401); }
  if (payload.type !== "refresh") throw httpError("Invalid refresh token", 401);
  const oldHash = hashToken(rawToken);
  const stored = await RefreshToken.findOneAndUpdate(
    { tokenHash: oldHash, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } }, { new: true }
  ).select("+tokenHash");
  if (!stored) throw httpError("Refresh session is no longer valid", 401);
  const user = await User.findOne({ _id: payload.sub, isBlocked: false, deletedAt: null });
  if (!user) throw httpError("Account is unavailable", 401);
  const nextSession = await issueSession(user, req);
  stored.replacedByTokenHash = hashToken(nextSession.refreshToken);
  await stored.save();
  return nextSession;
}
async function logout(rawToken) {
  if (rawToken) await RefreshToken.updateOne({ tokenHash: hashToken(rawToken), revokedAt: null }, { $set: { revokedAt: new Date() } });
}
async function forgotPassword(emailInput) {
  const user = await User.findOne({ email: emailInput.toLowerCase(), deletedAt: null });
  if (user) {
    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    user.passwordResetOtpHash = hashToken(otp);
    user.passwordResetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.passwordResetTokenHash = undefined;
    user.passwordResetTokenExpiresAt = undefined;
    await user.save();
    try {
      await sendEmail({ to: user.email, subject: "Your Zeerostock password reset code",
        text: "Your password reset code is " + otp + ". It expires in 10 minutes. If you did not request this, ignore this email.",
        html: "<p>Your Zeerostock password reset code is:</p><p style=\"font-size:28px;font-weight:bold;letter-spacing:8px\">" + otp + "</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>" });
    } catch (error) {
      // Keep the public response identical for existing and unknown email addresses.
      logger.warn("Password reset email delivery failed", { message: error.message });
    }
  }
  return { message: "If an account exists for that email, a password reset code has been sent." };
}
async function verifyPasswordOtp(emailInput, otp) {
  const user = await User.findOne({ email: emailInput.toLowerCase(), passwordResetOtpHash: hashToken(otp), passwordResetOtpExpiresAt: { $gt: new Date() }, deletedAt: null }).select("+passwordResetOtpHash +passwordResetOtpExpiresAt");
  if (!user) throw httpError("The reset code is invalid or expired", 400);
  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetOtpHash = undefined;
  user.passwordResetOtpExpiresAt = undefined;
  user.passwordResetTokenHash = hashToken(resetToken);
  user.passwordResetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  return { resetToken, expiresInSeconds: 600 };
}
async function resetPassword(emailInput, resetToken, newPassword) {
  const user = await User.findOne({ email: emailInput.toLowerCase(), passwordResetTokenHash: hashToken(resetToken), passwordResetTokenExpiresAt: { $gt: new Date() }, deletedAt: null }).select("+passwordResetTokenHash +passwordResetTokenExpiresAt +password");
  if (!user) throw httpError("Password reset session is invalid or expired. Request a new code.", 400);
  user.password = newPassword;
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExpiresAt = undefined;
  await user.save();
  await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  return { message: "Password reset successfully. Please sign in with your new password." };
}
module.exports = { publicUser, register, verifyEmail, resendVerification, login, refresh, logout, forgotPassword, verifyPasswordOtp, resetPassword };
