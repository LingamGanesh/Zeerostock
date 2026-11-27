const mongoose = require("mongoose");
const Inventory = require("../../models/Inventory");
const InventoryMovement = require("../models/InventoryMovement");

async function adjustStock({ inventoryId, direction, quantity, reason, reference, userId, session: externalSession }) {
  const session = externalSession || await mongoose.startSession();
  let updatedInventory;
  const applyAdjustment = async () => {
    const inventory = await Inventory.findOne({ _id: inventoryId, isActive: { $ne: false } }).session(session);
    if (!inventory) {
      const error = new Error("Active inventory item not found");
      error.statusCode = 404;
      throw error;
    }
    const previousQuantity = inventory.quantity;
    let newQuantity = quantity;
    if (direction === "in") newQuantity = previousQuantity + quantity;
    if (direction === "out") newQuantity = previousQuantity - quantity;
    if (direction === "set") newQuantity = quantity;
    if (!Number.isSafeInteger(newQuantity) || newQuantity < 0) {
      const error = new Error("Invalid stock quantity or insufficient stock for this adjustment");
      error.statusCode = 409;
      throw error;
    }
    // Setting the balance to its current value is a valid no-op, not a movement.
    // Avoid creating a zero-quantity InventoryMovement (the schema requires >= 1).
    if (newQuantity === previousQuantity) {
      await inventory.populate("supplier", "name contactEmail country");
      updatedInventory = inventory;
      return;
    }
    const result = await Inventory.updateOne(
      { _id: inventoryId, isActive: { $ne: false }, quantity: previousQuantity },
      { $set: { quantity: newQuantity } },
      { session, runValidators: true }
    );
    if (result.modifiedCount !== 1) {
      const error = new Error("Stock changed during this request. Please retry.");
      error.statusCode = 409;
      throw error;
    }
    await InventoryMovement.create([{
      inventory: inventoryId, movementType: direction,
      quantity: Math.abs(newQuantity - previousQuantity), previousQuantity, newQuantity,
      reason, reference, performedBy: userId,
    }], { session });
    updatedInventory = await Inventory.findById(inventoryId)
      .populate("supplier", "name contactEmail country").session(session);
  };

  try {
    if (externalSession) await applyAdjustment();
    else await session.withTransaction(applyAdjustment);
    return updatedInventory;
  } catch (error) {
    if (/transaction numbers are only allowed|transaction is not supported|replica set/i.test(error.message || "")) {
      error.statusCode = 503;
      error.message = "Stock movement auditing requires MongoDB running as a replica set or MongoDB Atlas.";
    }
    throw error;
  } finally {
    if (!externalSession) await session.endSession();
  }
}

module.exports = { adjustStock };
