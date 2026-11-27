const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const PurchaseOrder = require("../src/models/PurchaseOrder");

const validOrder = () => new PurchaseOrder({
  orderNumber: "PO-TEST-1001",
  supplier: new mongoose.Types.ObjectId(),
  items: [{
    inventory: new mongoose.Types.ObjectId(),
    productName: "Basmati Rice",
    sku: "RICE-001",
    orderedQuantity: 10,
    unitPrice: 85,
  }],
  createdBy: new mongoose.Types.ObjectId(),
});

test("purchase order accepts valid item and defaults received quantity and status", () => {
  const order = validOrder();
  assert.equal(order.status, "pending");
  assert.equal(order.items[0].receivedQuantity, 0);
  assert.equal(order.validateSync(), undefined);
});

test("purchase order rejects empty items and invalid status", () => {
  const empty = validOrder();
  empty.items = [];
  assert.ok(empty.validateSync());

  const invalidStatus = validOrder();
  invalidStatus.status = "cancelled";
  assert.ok(invalidStatus.validateSync());
});

test("purchase order rejects invalid quantities and negative unit prices", () => {
  const invalidQuantity = validOrder();
  invalidQuantity.items[0].orderedQuantity = 0;
  assert.ok(invalidQuantity.validateSync());

  const invalidPrice = validOrder();
  invalidPrice.items[0].unitPrice = -1;
  assert.ok(invalidPrice.validateSync());
});
