const test = require("node:test");
const assert = require("node:assert/strict");
const Supplier = require("../models/Supplier");

const validSupplier = (overrides = {}) => new Supplier({
  name: "Acme Supplies",
  contactEmail: "orders@acme.example",
  country: "India",
  ...overrides,
});

test("supplier accepts an omitted phone number", () => {
  const supplier = validSupplier();
  assert.equal(supplier.validateSync(), undefined);
});

test("supplier accepts an empty optional phone number", () => {
  const supplier = validSupplier({ phone: "" });
  assert.equal(supplier.validateSync(), undefined);
});

test("supplier rejects a malformed non-empty phone number", () => {
  const supplier = validSupplier({ phone: "not-a-phone" });
  assert.ok(supplier.validateSync());
});
