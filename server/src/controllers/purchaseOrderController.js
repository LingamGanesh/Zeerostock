const mongoose = require("mongoose");
const PurchaseOrder = require("../models/PurchaseOrder");
const Inventory = require("../../models/Inventory");
const Supplier = require("../../models/Supplier");
const { adjustStock } = require("../services/inventoryService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const fail = (res, statusCode, message) => res.status(statusCode).json({ success: false, message, data: null, errors: [] });

const listPurchaseOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};
  if (["pending", "approved", "partially_received", "completed"].includes(req.query.status)) filter.status = req.query.status;
  const [orders, total] = await Promise.all([
    PurchaseOrder.find(filter).populate("supplier", "name contactEmail country")
      .populate("createdBy", "name email").populate("approvedBy", "name email")
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    PurchaseOrder.countDocuments(filter),
  ]);
  return sendSuccess(res, { data: { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

const createPurchaseOrder = asyncHandler(async (req, res) => {
  const { supplier: supplierId, items, notes = "" } = req.body || {};
  if (!mongoose.isValidObjectId(supplierId) || !Array.isArray(items) || !items.length || items.length > 100) {
    return fail(res, 400, "A valid supplier and 1–100 order items are required");
  }
  if (typeof notes !== "string" || notes.length > 500) return fail(res, 400, "Notes must be 500 characters or fewer");
  const supplier = await Supplier.findOne({ _id: supplierId, isActive: true });
  if (!supplier) return fail(res, 400, "Select an active supplier");
  const normalized = [];
  const seen = new Set();
  for (const line of items) {
    if (!mongoose.isValidObjectId(line.inventoryId) || !Number.isSafeInteger(Number(line.quantity)) || Number(line.quantity) < 1 ||
        !Number.isFinite(Number(line.unitPrice)) || Number(line.unitPrice) < 0) {
      return fail(res, 400, "Each item needs a valid inventory ID, positive whole quantity and non-negative unit price");
    }
    if (seen.has(String(line.inventoryId))) return fail(res, 400, "A product can only appear once in a purchase order");
    seen.add(String(line.inventoryId));
    const product = await Inventory.findOne({ _id: line.inventoryId, supplier: supplierId, isActive: { $ne: false } });
    if (!product) return fail(res, 400, "Every product must be active and assigned to the selected supplier");
    normalized.push({ inventory: product._id, productName: product.product_name, sku: product.sku,
      orderedQuantity: Number(line.quantity), unitPrice: Number(line.unitPrice) });
  }
  const order = await PurchaseOrder.create({
    orderNumber: `PO-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    supplier: supplierId, items: normalized, notes: notes.trim(), createdBy: req.user._id,
  });
  await order.populate("supplier", "name contactEmail country");
  return sendSuccess(res, { statusCode: 201, message: "Purchase order created", data: order });
});

const approvePurchaseOrder = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, "Invalid purchase order ID");
  const order = await PurchaseOrder.findOneAndUpdate(
    { _id: req.params.id, status: "pending" },
    { $set: { status: "approved", approvedBy: req.user._id, approvedAt: new Date() } },
    { new: true, runValidators: true }
  ).populate("supplier", "name contactEmail");
  if (!order) return fail(res, 409, "Purchase order not found or is no longer pending");
  return sendSuccess(res, { message: "Purchase order approved", data: order });
});

const receivePurchaseOrder = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, "Invalid purchase order ID");
  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) return fail(res, 404, "Purchase order not found");
  if (!["approved", "partially_received"].includes(order.status)) return fail(res, 409, "Only approved purchase orders can receive stock");
  const receivedLines = req.body?.items;
  if (!Array.isArray(receivedLines) || !receivedLines.length) return fail(res, 400, "Provide at least one received item");
  const updates = [];
  for (const received of receivedLines) {
    const line = order.items.id(received.itemId);
    const quantity = Number(received.quantity);
    if (!line || !Number.isSafeInteger(quantity) || quantity < 1 || line.receivedQuantity + quantity > line.orderedQuantity) {
      return fail(res, 400, "Received quantities must be positive whole numbers and cannot exceed the remaining ordered quantity");
    }
    if (updates.some((entry) => String(entry.line._id) === String(line._id))) return fail(res, 400, "Do not submit the same order line more than once");
    updates.push({ line, quantity });
  }

  // Each stock increment is committed together with its audit movement. If a later
  // line fails, already received lines remain accurately recorded for safe retry.
  for (const entry of updates) {
    await adjustStock({
      inventoryId: entry.line.inventory,
      direction: "in",
      quantity: entry.quantity,
      reason: "Purchase order receipt",
      reference: order.orderNumber,
      userId: req.user._id,
    });
    entry.line.receivedQuantity += entry.quantity;
    // Persist each successful receipt immediately so a later line failure can
    // never cause an already-added stock quantity to be received twice on retry.
    order.status = "partially_received";
    await order.save();
  }
  const complete = order.items.every((line) => line.receivedQuantity === line.orderedQuantity);
  order.status = complete ? "completed" : "partially_received";
  await order.save();
  await order.populate("supplier", "name contactEmail country");
  return sendSuccess(res, { message: "Received stock and recorded inventory movements", data: order });
});

module.exports = { listPurchaseOrders, createPurchaseOrder, approvePurchaseOrder, receivePurchaseOrder };
