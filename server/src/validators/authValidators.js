const { z } = require("zod");
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
}).strict();
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
}).strict();
const emailSchema = z.object({ email: z.string().trim().email().max(254) }).strict();
const verifyEmailSchema = z.object({ token: z.string().min(32).max(256) }).strict();
const verifyOtpSchema = z.object({
  email: z.string().trim().email().max(254),
  otp: z.string().regex(/^\d{6}$/),
}).strict();
const resetPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
  resetToken: z.string().min(32).max(256),
  newPassword: z.string().min(8).max(72),
}).strict();
module.exports = { registerSchema, loginSchema, emailSchema, verifyEmailSchema, verifyOtpSchema, resetPasswordSchema };
