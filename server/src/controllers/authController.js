const authService = require("../services/authService");
const { getRefreshCookieOptions } = require("../utils/tokens");
const { sendSuccess } = require("../utils/apiResponse");
function setRefreshCookie(res, token) { res.cookie("refreshToken", token, getRefreshCookieOptions()); }
function clearRefreshCookie(res) {
  const options = getRefreshCookieOptions();
  res.clearCookie("refreshToken", { httpOnly: options.httpOnly, secure: options.secure, sameSite: options.sameSite, path: options.path });
}
async function register(req, res) {
  const session = await authService.register(req.body, req);
  setRefreshCookie(res, session.refreshToken);
  return sendSuccess(res, { statusCode: 201, message: "Account created successfully", data: { accessToken: session.accessToken, user: session.user } });
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
module.exports = { register, login, refresh, logout, me };
