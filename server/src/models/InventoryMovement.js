const mongoose = require("mongoose");

const inventoryMovementSchema = new mongoose.Schema({
  inventory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
    required: true,
    index: true,
  },
  movementType: {
    type: String,
    enum: ["in", "out", "set"],
    required: true,
  },
  quantity: { type: Number, required: true, min: 1 },
  previousQuantity: { type: Number, required: true, min: 0 },
  newQuantity: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true, trim: true, maxlength: 250 },
  reference: { type: String, trim: true, maxlength: 100, default: "" },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { timestamps: true, versionKey: false });

inventoryMovementSchema.index({ inventory: 1, createdAt: -1 });
inventoryMovementSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryMovement", inventoryMovementSchema);
