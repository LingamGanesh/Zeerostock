const mongoose = require("mongoose");

const purchaseOrderItemSchema = new mongoose.Schema({
  inventory: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true },
  productName: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true, uppercase: true },
  orderedQuantity: { type: Number, required: true, min: 1 },
  receivedQuantity: { type: Number, default: 0, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
}, { _id: true });

const purchaseOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
  items: { type: [purchaseOrderItemSchema], required: true, validate: [(items) => items.length > 0, "At least one item is required"] },
  status: { type: String, enum: ["pending", "approved", "partially_received", "completed"], default: "pending", index: true },
  notes: { type: String, trim: true, maxlength: 500, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  approvedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

purchaseOrderSchema.index({ createdAt: -1, status: 1 });
module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
