const Inventory = require("../../models/Inventory");
const InventoryMovement = require("../models/InventoryMovement");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const getDashboardSummary = asyncHandler(async (req, res) => {
  const activeFilter = { isActive: { $ne: false } };
  const [totals, categoryBreakdown, recentMovements] = await Promise.all([
    Inventory.aggregate([
      { $match: activeFilter },
      { $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalUnits: { $sum: "$quantity" },
        totalStockValue: { $sum: { $multiply: ["$price", "$quantity"] } },
        lowStockProducts: { $sum: { $cond: [{ $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", 5] }] }, 1, 0] } },
        outOfStockProducts: { $sum: { $cond: [{ $eq: ["$quantity", 0] }, 1, 0] } },
      } },
      { $project: { _id: 0, totalProducts: 1, totalUnits: 1, totalStockValue: { $round: ["$totalStockValue", 2] }, lowStockProducts: 1, outOfStockProducts: 1 } },
    ]),
    Inventory.aggregate([
      { $match: activeFilter },
      { $group: { _id: { $ifNull: ["$category", "General"] }, products: { $sum: 1 }, units: { $sum: "$quantity" }, stockValue: { $sum: { $multiply: ["$price", "$quantity"] } } } },
      { $project: { _id: 0, category: "$_id", products: 1, units: 1, stockValue: { $round: ["$stockValue", 2] } } },
      { $sort: { stockValue: -1, category: 1 } },
    ]),
    InventoryMovement.find({})
      .populate("inventory", "product_name sku")
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
  ]);

  return sendSuccess(res, {
    message: "Dashboard summary retrieved successfully",
    data: {
      summary: totals[0] || { totalProducts: 0, totalUnits: 0, totalStockValue: 0, lowStockProducts: 0, outOfStockProducts: 0 },
      categoryBreakdown,
      recentMovements,
    },
  });
});

module.exports = { getDashboardSummary };
