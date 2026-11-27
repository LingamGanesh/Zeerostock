const dotenv = require("dotenv");
const { z } = require("zod");
dotenv.config();
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must contain at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must contain at least 32 characters"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().min(3).default("Zeerostock <onboarding@resend.dev>"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "verbose", "debug"]).default("info"),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => issue.path.join(".") + ": " + issue.message).join("\n");
  throw new Error("Invalid environment configuration:\n" + details);
}
module.exports = {
  ...parsed.data,
  clientOrigins: parsed.data.CLIENT_URL.split(",").map((origin) => origin.trim()).filter(Boolean),
  isProduction: parsed.data.NODE_ENV === "production",
};
