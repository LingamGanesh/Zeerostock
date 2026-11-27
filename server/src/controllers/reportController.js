const Inventory = require("../../models/Inventory");
const InventoryMovement = require("../models/InventoryMovement");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return undefined;
  if (endOfDay) date.setUTCDate(date.getUTCDate() + 1);
  return date;
};

const getStockReport = asyncHandler(async (req, res) => {
  const requestedType = req.query.type || "all";
  if (!["all", "low", "out"].includes(requestedType)) return res.status(400).json({ success: false, message: "type must be all, low, or out", data: null, errors: [] });
  const type = requestedType;
  const rawLimit = req.query.limit === undefined ? 5000 : Number(req.query.limit);
  if (!Number.isInteger(rawLimit) || rawLimit < 1) return res.status(400).json({ success: false, message: "limit must be a positive integer", data: null, errors: [] });
  const limit = Math.min(5000, rawLimit);
  const filter = { isActive: { $ne: false } };
  if (type === "low") filter.$expr = { $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", 5] }] };
  if (type === "out") filter.quantity = 0;

  const [summary, items] = await Promise.all([
    Inventory.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: {
        _id: null,
        productCount: { $sum: 1 },
        totalUnits: { $sum: "$quantity" },
        stockValue: { $sum: { $multiply: ["$quantity", "$price"] } },
        lowStockCount: { $sum: { $cond: [{ $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", 5] }] }, 1, 0] } },
        outOfStockCount: { $sum: { $cond: [{ $eq: ["$quantity", 0] }, 1, 0] } },
      } },
      { $project: { _id: 0, productCount: 1, totalUnits: 1, stockValue: { $round: ["$stockValue", 2] }, lowStockCount: 1, outOfStockCount: 1 } },
    ]),
    Inventory.find(filter).select("product_name sku category quantity price supplier updatedAt")
      .populate("supplier", "name").sort({ quantity: 1, product_name: 1 }).limit(limit).lean(),
  ]);

  return sendSuccess(res, {
    message: "Stock report retrieved successfully",
    data: {
      summary: summary[0] || { productCount: 0, totalUnits: 0, stockValue: 0, lowStockCount: 0, outOfStockCount: 0 },
      items,
      truncated: items.length === limit && limit === 5000,
    },
  });
});

const getMovementReport = asyncHandler(async (req, res) => {
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to, true);
  if (from === undefined || to === undefined) {
    return res.status(400).json({ success: false, message: "Dates must use valid YYYY-MM-DD values", data: null, errors: [] });
  }
  if (from && to && from >= to) {
    return res.status(400).json({ success: false, message: "The end date must be on or after the start date", data: null, errors: [] });
  }

  const rawPage = req.query.page === undefined ? 1 : Number(req.query.page);
  const rawLimit = req.query.limit === undefined ? 25 : Number(req.query.limit);
  if (!Number.isInteger(rawPage) || rawPage < 1 || !Number.isInteger(rawLimit) || rawLimit < 1) return res.status(400).json({ success: false, message: "page and limit must be positive integers", data: null, errors: [] });
  if (req.query.movementType && !["in", "out", "set"].includes(req.query.movementType)) return res.status(400).json({ success: false, message: "movementType must be in, out, or set", data: null, errors: [] });
  const page = rawPage;
  const limit = Math.min(100, rawLimit);
  const filter = {};
  if (from || to) filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lt: to } : {}) };
  if (req.query.movementType) filter.movementType = req.query.movementType;

  const [movements, total] = await Promise.all([
    InventoryMovement.find(filter)
      .populate("inventory", "product_name sku")
      .populate("performedBy", "name email")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit).limit(limit).lean(),
    InventoryMovement.countDocuments(filter),
  ]);
  return sendSuccess(res, {
    message: "Movement report retrieved successfully",
    data: { movements, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
});

module.exports = { getStockReport, getMovementReport };
