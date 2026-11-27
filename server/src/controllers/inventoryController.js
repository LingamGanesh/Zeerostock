const mongoose = require("mongoose");
const Inventory = require("../../models/Inventory");
const Supplier = require("../../models/Supplier");
const InventoryMovement = require("../models/InventoryMovement");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const { adjustStock } = require("../services/inventoryService");
const {
  createInventorySchema,
  updateInventorySchema,
  stockAdjustmentSchema,
} = require("../validators/inventoryValidators");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const listInventory = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};
  if (req.query.q) {
    const search = escapeRegex(String(req.query.q).trim().slice(0, 80));
    filter.$or = [
      { product_name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
    ];
  }
  if (req.query.category) filter.category = String(req.query.category).trim();
  if (req.query.supplier) {
    if (!mongoose.isValidObjectId(req.query.supplier)) {
      return res.status(400).json({ success: false, message: "Invalid supplier ID", data: null, errors: [] });
    }
    filter.supplier = req.query.supplier;
  }
  if (req.query.lowStock === "true") filter.$expr = { $lte: ["$quantity", 5] };

  const [items, total] = await Promise.all([
    Inventory.find(filter)
      .populate("supplier", "name contactEmail country")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Inventory.countDocuments(filter),
  ]);
  return sendSuccess(res, {
    message: "Inventory retrieved successfully",
    data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
});

const getInventoryItem = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid inventory ID", data: null, errors: [] });
  }
  const item = await Inventory.findById(req.params.id).populate("supplier", "name contactEmail country");
  if (!item) return res.status(404).json({ success: false, message: "Inventory item not found", data: null, errors: [] });
  return sendSuccess(res, { data: item });
});

const createInventoryItem = asyncHandler(async (req, res) => {
  const parsed = createInventorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Validation failed", data: null,
      errors: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) });
  }
  const supplier = await Supplier.findById(parsed.data.supplier);
  if (!supplier) return res.status(400).json({ success: false, message: "Selected supplier does not exist", data: null, errors: [] });
  const item = await Inventory.create(parsed.data);
  await item.populate("supplier", "name contactEmail country");
  return sendSuccess(res, { statusCode: 201, message: "Inventory item created", data: item });
});

const updateInventoryItem = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid inventory ID", data: null, errors: [] });
  }
  const parsed = updateInventorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Validation failed", data: null,
      errors: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) });
  }
  if (parsed.data.supplier && !(await Supplier.exists({ _id: parsed.data.supplier }))) {
    return res.status(400).json({ success: false, message: "Selected supplier does not exist", data: null, errors: [] });
  }
  const item = await Inventory.findByIdAndUpdate(req.params.id, { $set: parsed.data }, {
    new: true, runValidators: true,
  }).populate("supplier", "name contactEmail country");
  if (!item) return res.status(404).json({ success: false, message: "Inventory item not found", data: null, errors: [] });
  return sendSuccess(res, { message: "Inventory item updated", data: item });
});

const adjustInventoryStock = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid inventory ID", data: null, errors: [] });
  }
  const parsed = stockAdjustmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Validation failed", data: null,
      errors: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) });
  }
  const item = await adjustStock({ inventoryId: req.params.id, ...parsed.data, userId: req.user._id });
  return sendSuccess(res, { message: "Stock adjusted and movement recorded", data: item });
});

const getInventoryMovements = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid inventory ID", data: null, errors: [] });
  }
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = { inventory: req.params.id };
  const [movements, total] = await Promise.all([
    InventoryMovement.find(filter).populate("performedBy", "name email")
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    InventoryMovement.countDocuments(filter),
  ]);
  return sendSuccess(res, {
    data: { movements, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
});

module.exports = {
  listInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  adjustInventoryStock,
  getInventoryMovements,
};
