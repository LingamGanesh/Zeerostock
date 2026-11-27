const test = require("node:test");
const assert = require("node:assert/strict");
const { registerSchema, loginSchema, emailSchema, verifyEmailSchema, verifyOtpSchema, resetPasswordSchema } = require("../src/validators/authValidators");
const {
  createInventorySchema,
  updateInventorySchema,
  stockAdjustmentSchema,
} = require("../src/validators/inventoryValidators");

test("registration trims names and email and rejects unknown fields", () => {
  const result = registerSchema.safeParse({
    name: "  Ganesh  ",
    email: "  ganesh@example.com  ",
    password: "securepass123",
  });
  assert.equal(result.success, true);
  assert.equal(result.data.name, "Ganesh");
  assert.equal(result.data.email, "ganesh@example.com");
  assert.equal(registerSchema.safeParse({
    name: "Ganesh",
    email: "ganesh@example.com",
    password: "securepass123",
    role: "admin",
  }).success, false);
});

test("registration rejects weak passwords and malformed emails", () => {
  assert.equal(registerSchema.safeParse({
    name: "Ganesh", email: "not-an-email", password: "short",
  }).success, false);
});

test("login accepts valid credentials and rejects extra fields", () => {
  assert.equal(loginSchema.safeParse({
    email: "ganesh@example.com", password: "password123",
  }).success, true);
  assert.equal(loginSchema.safeParse({
    email: "ganesh@example.com", password: "password123", role: "admin",
  }).success, false);
});


test("email verification and password recovery schemas validate all required inputs", () => {
  assert.equal(emailSchema.safeParse({ email: "ganesh@example.com" }).success, true);
  assert.equal(verifyEmailSchema.safeParse({ token: "a".repeat(64) }).success, true);
  assert.equal(verifyEmailSchema.safeParse({ token: "short" }).success, false);
  assert.equal(verifyOtpSchema.safeParse({ email: "ganesh@example.com", otp: "123456" }).success, true);
  assert.equal(verifyOtpSchema.safeParse({ email: "ganesh@example.com", otp: "12ab56" }).success, false);
  assert.equal(resetPasswordSchema.safeParse({
    email: "ganesh@example.com", resetToken: "b".repeat(64), newPassword: "newPassword123",
  }).success, true);
  assert.equal(resetPasswordSchema.safeParse({
    email: "ganesh@example.com", resetToken: "b".repeat(64), newPassword: "short",
  }).success, false);
});

test("inventory creation normalizes SKU and applies safe defaults", () => {
  const result = createInventorySchema.safeParse({
    product_name: "  Rice  ",
    sku: " rice-001 ",
    price: "120.50",
    supplier: "507f1f77bcf86cd799439011",
  });
  assert.equal(result.success, true);
  assert.equal(result.data.product_name, "Rice");
  assert.equal(result.data.sku, "RICE-001");
  assert.equal(result.data.quantity, 0);
  assert.equal(result.data.category, "General");
});

test("inventory creation rejects blank, negative, and malformed numeric values", () => {
  const base = {
    product_name: "Rice",
    sku: "RICE-001",
    price: 100,
    supplier: "507f1f77bcf86cd799439011",
  };
  assert.equal(createInventorySchema.safeParse({ ...base, quantity: "" }).success, false);
  assert.equal(createInventorySchema.safeParse({ ...base, price: "" }).success, false);
  assert.equal(createInventorySchema.safeParse({ ...base, quantity: -1 }).success, false);
  assert.equal(createInventorySchema.safeParse({ ...base, supplier: "invalid" }).success, false);
});

test("inventory update requires at least one allowed field", () => {
  assert.equal(updateInventorySchema.safeParse({}).success, false);
  assert.equal(updateInventorySchema.safeParse({ price: "89.99" }).success, true);
  assert.equal(updateInventorySchema.safeParse({ price: "" }).success, false);
  assert.equal(updateInventorySchema.safeParse({ role: "admin" }).success, false);
});

test("stock adjustment validates direction, positive quantity and reason", () => {
  assert.equal(stockAdjustmentSchema.safeParse({
    direction: "in", quantity: "5", reason: "Supplier delivery",
  }).success, true);
  assert.equal(stockAdjustmentSchema.safeParse({
    direction: "in", quantity: "", reason: "Supplier delivery",
  }).success, false);
  assert.equal(stockAdjustmentSchema.safeParse({
    direction: "sideways", quantity: 5, reason: "Supplier delivery",
  }).success, false);
  assert.equal(stockAdjustmentSchema.safeParse({
    direction: "out", quantity: 5, reason: "no",
  }).success, false);
});
