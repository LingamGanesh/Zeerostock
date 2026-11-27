const { z } = require("zod");
const mongoose = require("mongoose");
const config = require("../src/config/env");
const User = require("../src/models/User");

const adminSchema = z.object({
  ADMIN_NAME: z.string().trim().min(2).max(80),
  ADMIN_EMAIL: z.string().trim().email().max(254),
  ADMIN_PASSWORD: z.string().min(12).max(128),
});

async function main() {
  const parsed = adminSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.path.join(".") + ": " + issue.message).join("\n");
    throw new Error("Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in server/.env before running this command.\n" + details);
  }

  await mongoose.connect(config.MONGO_URI);
  const existingAdmin = await User.findOne({ role: "admin", deletedAt: null }).select("_id email");
  if (existingAdmin) {
    throw new Error("An active admin already exists. Bootstrap is disabled to prevent privilege escalation.");
  }

  const email = parsed.data.ADMIN_EMAIL.toLowerCase();
  const existingUser = await User.findOne({ email }).select("_id");
  if (existingUser) {
    throw new Error("That email already belongs to an account. Use a different email for the initial admin.");
  }

  const admin = await User.create({
    name: parsed.data.ADMIN_NAME,
    email,
    password: parsed.data.ADMIN_PASSWORD,
    role: "admin",
    isEmailVerified: true,
  });

  process.stdout.write("Initial admin created successfully: " + admin.email + "\n");
}

main()
  .catch((error) => {
    process.stderr.write("Admin bootstrap failed: " + error.message + "\n");
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
