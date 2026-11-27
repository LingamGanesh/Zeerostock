const express = require("express");
const authController = require("../controllers/authController");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const trustedOrigin = require("../middleware/trustedOrigin");
const authenticate = require("../middleware/authenticate");
const {
  registerSchema, loginSchema, emailSchema, verifyEmailSchema, verifyOtpSchema, resetPasswordSchema,
} = require("../validators/authValidators");
const router = express.Router();
router.post("/register", trustedOrigin, validate(registerSchema), asyncHandler(authController.register));
router.post("/verify-email", trustedOrigin, validate(verifyEmailSchema), asyncHandler(authController.verifyEmail));
router.post("/resend-verification", trustedOrigin, validate(emailSchema), asyncHandler(authController.resendVerification));
router.post("/login", trustedOrigin, validate(loginSchema), asyncHandler(authController.login));
router.post("/refresh", trustedOrigin, asyncHandler(authController.refresh));
router.post("/logout", trustedOrigin, asyncHandler(authController.logout));
router.post("/forgot-password", trustedOrigin, validate(emailSchema), asyncHandler(authController.forgotPassword));
router.post("/verify-reset-otp", trustedOrigin, validate(verifyOtpSchema), asyncHandler(authController.verifyPasswordOtp));
router.post("/reset-password", trustedOrigin, validate(resetPasswordSchema), asyncHandler(authController.resetPassword));
router.get("/me", authenticate, asyncHandler(authController.me));
module.exports = router;
