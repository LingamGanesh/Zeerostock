const mongoose = require("mongoose");
const PurchaseOrder = require("../models/PurchaseOrder");
const Inventory = require("../../models/Inventory");
const Supplier = require("../../models/Supplier");
const { adjustStock } = require("../services/inventoryService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const fail = (res, statusCode, message) => res.status(statusCode).json({ success: false, message, data: null, errors: [] });

const listPurchaseOrders = asyncHandler(async (req, res) => {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const requestedLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(requestedLimit) || requestedLimit < 1) {
    return fail(res, 400, "page and limit must be positive integers");
  }
  if (req.query.status && !["pending", "approved", "partially_received", "completed"].includes(req.query.status)) {
    return fail(res, 400, "status must be pending, approved, partially_received, or completed");
  }
  const limit = Math.min(100, requestedLimit);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
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
    if (!line || typeof line !== "object" || !mongoose.isValidObjectId(line.inventoryId) ||
        !Number.isSafeInteger(Number(line.quantity)) || Number(line.quantity) < 1 ||
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
  const receivedLines = req.body?.items;
  if (!Array.isArray(receivedLines) || !receivedLines.length || receivedLines.length > 100 ||
      receivedLines.some((line) => !line || typeof line !== "object" || Array.isArray(line))) {
    return fail(res, 400, "Provide 1–100 valid received items");
  }

  const session = await mongoose.startSession();
  let completedOrder;
  try {
    await session.withTransaction(async () => {
      const order = await PurchaseOrder.findById(req.params.id).session(session);
      if (!order) {
        const error = new Error("Purchase order not found");
        error.statusCode = 404;
        throw error;
      }
      if (!["approved", "partially_received"].includes(order.status)) {
        const error = new Error("Only approved purchase orders can receive stock");
        error.statusCode = 409;
        throw error;
      }
      const updates = [];
      for (const received of receivedLines) {
        const line = order.items.id(received.itemId);
        const quantity = Number(received.quantity);
        if (!line || !Number.isSafeInteger(quantity) || quantity < 1 ||
            line.receivedQuantity + quantity > line.orderedQuantity) {
          const error = new Error("Received quantities must be positive whole numbers and cannot exceed the remaining ordered quantity");
          error.statusCode = 400;
          throw error;
        }
        if (updates.some((entry) => String(entry.line._id) === String(line._id))) {
          const error = new Error("Do not submit the same order line more than once");
          error.statusCode = 400;
          throw error;
        }
        updates.push({ line, quantity });
      }

      for (const entry of updates) {
        await adjustStock({
          inventoryId: entry.line.inventory, direction: "in", quantity: entry.quantity,
          reason: "Purchase order receipt", reference: order.orderNumber,
          userId: req.user._id, session,
        });
        entry.line.receivedQuantity += entry.quantity;
      }
      order.status = order.items.every((line) => line.receivedQuantity === line.orderedQuantity)
        ? "completed" : "partially_received";
      await order.save({ session });
      completedOrder = order;
    });
    await completedOrder.populate("supplier", "name contactEmail country");
    return sendSuccess(res, { message: "Received stock and recorded inventory movements", data: completedOrder });
  } catch (error) {
    if (/transaction numbers are only allowed|transaction is not supported|replica set/i.test(error.message || "")) {
      error.statusCode = 503;
      error.message = "Purchase order receiving requires MongoDB running as a replica set or MongoDB Atlas.";
    }
    throw error;
  } finally {
    await session.endSession();
  }
});

module.exports = { listPurchaseOrders, createPurchaseOrder, approvePurchaseOrder, receivePurchaseOrder };
