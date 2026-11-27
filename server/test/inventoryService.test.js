const test = require("node:test");
const assert = require("node:assert/strict");
const Inventory = require("../../models/Inventory");
const InventoryMovement = require("../models/InventoryMovement");
const { adjustStock } = require("../services/inventoryService");

test("setting stock to its current balance is a no-op and creates no movement", async () => {
  const originalFindOne = Inventory.findOne;
  const originalUpdateOne = Inventory.updateOne;
  const originalCreate = InventoryMovement.create;
  const item = {
    quantity: 5,
    populate: async function populate() { return this; },
  };
  let movementCreated = false;
  let inventoryUpdated = false;

  Inventory.findOne = () => ({ session: async () => item });
  Inventory.updateOne = async () => { inventoryUpdated = true; return { modifiedCount: 1 }; };
  InventoryMovement.create = async () => { movementCreated = true; };

  try {
    const result = await adjustStock({
      inventoryId: "507f1f77bcf86cd799439011",
      direction: "set",
      quantity: 5,
      reason: "Reconcile count",
      reference: "",
      userId: "507f1f77bcf86cd799439012",
      session: {},
    });

    assert.equal(result, item);
    assert.equal(inventoryUpdated, false);
    assert.equal(movementCreated, false);
  } finally {
    Inventory.findOne = originalFindOne;
    Inventory.updateOne = originalUpdateOne;
    InventoryMovement.create = originalCreate;
  }
});
