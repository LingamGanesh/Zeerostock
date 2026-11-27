const authService = require("../services/authService");
const { getRefreshCookieOptions } = require("../utils/tokens");
const { sendSuccess } = require("../utils/apiResponse");
function setRefreshCookie(res, token) { res.cookie("refreshToken", token, getRefreshCookieOptions()); }
function clearRefreshCookie(res) {
  const options = getRefreshCookieOptions();
  res.clearCookie("refreshToken", { httpOnly: options.httpOnly, secure: options.secure, sameSite: options.sameSite, path: options.path });
}
async function register(req, res) {
  const result = await authService.register(req.body);
  return sendSuccess(res, { statusCode: 201, message: "Account created. Check your email to verify your address.", data: result });
}
async function verifyEmail(req, res) {
  const data = await authService.verifyEmail(req.body.token);
  return sendSuccess(res, { message: "Email verified successfully. You can now sign in.", data });
}
async function resendVerification(req, res) {
  const data = await authService.resendVerification(req.body.email);
  return sendSuccess(res, { message: data.message, data: null });
}
async function login(req, res) {
  const session = await authService.login(req.body, req);
  setRefreshCookie(res, session.refreshToken);
  return sendSuccess(res, { message: "Login successful", data: { accessToken: session.accessToken, user: session.user } });
}
async function refresh(req, res) {
  const session = await authService.refresh(req.cookies.refreshToken, req);
  setRefreshCookie(res, session.refreshToken);
  return sendSuccess(res, { message: "Session refreshed", data: { accessToken: session.accessToken, user: session.user } });
}
async function logout(req, res) {
  await authService.logout(req.cookies.refreshToken);
  clearRefreshCookie(res);
  return sendSuccess(res, { message: "Logout successful", data: null });
}
async function me(req, res) {
  return sendSuccess(res, { message: "Current user fetched", data: authService.publicUser(req.user) });
}
async function forgotPassword(req, res) {
  const data = await authService.forgotPassword(req.body.email);
  return sendSuccess(res, { message: data.message, data: null });
}
async function verifyPasswordOtp(req, res) {
  const data = await authService.verifyPasswordOtp(req.body.email, req.body.otp);
  return sendSuccess(res, { message: "Code verified. Choose a new password.", data });
}
async function resetPassword(req, res) {
  const data = await authService.resetPassword(req.body.email, req.body.resetToken, req.body.newPassword);
  return sendSuccess(res, { message: data.message, data: null });
}
module.exports = { register, verifyEmail, resendVerification, login, refresh, logout, me, forgotPassword, verifyPasswordOtp, resetPassword };
