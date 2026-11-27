const mongoose = require("mongoose");
const Inventory = require("../../models/Inventory");
const InventoryMovement = require("../models/InventoryMovement");

async function adjustStock({ inventoryId, direction, quantity, reason, reference, userId }) {
  const session = await mongoose.startSession();
  let updatedInventory;
  try {
    await session.withTransaction(async () => {
      const inventory = await Inventory.findById(inventoryId).session(session);
      if (!inventory) {
        const error = new Error("Inventory item not found");
        error.statusCode = 404;
        throw error;
      }

      const previousQuantity = inventory.quantity;
      let newQuantity = quantity;
      if (direction === "in") newQuantity = previousQuantity + quantity;
      if (direction === "out") newQuantity = previousQuantity - quantity;
      if (direction === "set") newQuantity = quantity;

      if (newQuantity < 0) {
        const error = new Error("Insufficient stock for this adjustment");
        error.statusCode = 409;
        throw error;
      }

      const result = await Inventory.updateOne(
        { _id: inventoryId, quantity: previousQuantity },
        { $set: { quantity: newQuantity } },
        { session, runValidators: true }
      );
      if (result.modifiedCount !== 1) {
        const error = new Error("Stock changed during this request. Please retry.");
        error.statusCode = 409;
        throw error;
      }

      await InventoryMovement.create([{
        inventory: inventoryId,
        movementType: direction,
        quantity: Math.abs(newQuantity - previousQuantity) || quantity,
        previousQuantity,
        newQuantity,
        reason,
        reference,
        performedBy: userId,
      }], { session });

      updatedInventory = await Inventory.findById(inventoryId)
        .populate("supplier", "name contactEmail country")
        .session(session);
    });
    return updatedInventory;
  } catch (error) {
    if (/transaction numbers are only allowed|transaction is not supported|replica set/i.test(error.message || "")) {
      error.statusCode = 503;
      error.message = "Stock movement auditing requires MongoDB running as a replica set or MongoDB Atlas.";
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

module.exports = { adjustStock };
