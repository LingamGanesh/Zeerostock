const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ["admin", "manager", "user"], default: "user", required: true },
  isBlocked: { type: Boolean, default: false, index: true },
  isEmailVerified: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true });

userSchema.pre("save", async function hashPassword() {
  if (this.isModified("password")) this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.index({ email: 1 }, { unique: true });
module.exports = mongoose.model("User", userSchema);
