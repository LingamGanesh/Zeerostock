const Inventory = require("../../models/Inventory");
const InventoryMovement = require("../models/InventoryMovement");
const PurchaseOrder = require("../models/PurchaseOrder");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const getDashboardSummary = asyncHandler(async (req, res) => {
  const activeFilter = { isActive: { $ne: false } };
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  monthStart.setUTCMonth(monthStart.getUTCMonth() - 5);
  const [totals, categoryBreakdown, recentMovements, purchaseTotals, monthlyPurchases, supplierPurchases, orderStatuses] = await Promise.all([
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
    PurchaseOrder.aggregate([
      { $project: { status: 1,
        orderedValue: { $sum: { $map: { input: "$items", as: "item", in: { $multiply: ["$item.orderedQuantity", "$item.unitPrice"] } } } },
        receivedValue: { $sum: { $map: { input: "$items", as: "item", in: { $multiply: ["$item.receivedQuantity", "$item.unitPrice"] } } } },
        pendingValue: { $sum: { $map: { input: "$items", as: "item", in: { $multiply: [{ $subtract: ["$item.orderedQuantity", "$item.receivedQuantity"] }, "$item.unitPrice"] } } } },
      } },
      { $group: { _id: null, orderCount: { $sum: 1 }, orderedValue: { $sum: "$orderedValue" }, receivedValue: { $sum: "$receivedValue" },
        pendingValue: { $sum: { $cond: [{ $in: ["$status", ["pending", "approved", "partially_received"]] }, "$pendingValue", 0] } } } },
      { $project: { _id: 0, orderCount: 1, orderedValue: { $round: ["$orderedValue", 2] }, receivedValue: { $round: ["$receivedValue", 2] }, pendingValue: { $round: ["$pendingValue", 2] } } },
    ]),
    PurchaseOrder.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "UTC" } }, orders: { $sum: 1 },
        orderedValue: { $sum: { $sum: { $map: { input: "$items", as: "item", in: { $multiply: ["$item.orderedQuantity", "$item.unitPrice"] } } } } } } },
      { $project: { _id: 0, month: "$_id", orders: 1, orderedValue: { $round: ["$orderedValue", 2] } } },
      { $sort: { month: 1 } },
    ]),
    PurchaseOrder.aggregate([
      { $group: { _id: "$supplier", orders: { $sum: 1 },
        orderedValue: { $sum: { $sum: { $map: { input: "$items", as: "item", in: { $multiply: ["$item.orderedQuantity", "$item.unitPrice"] } } } },
        receivedValue: { $sum: { $sum: { $map: { input: "$items", as: "item", in: { $multiply: ["$item.receivedQuantity", "$item.unitPrice"] } } } } } } },
      { $lookup: { from: "suppliers", localField: "_id", foreignField: "_id", as: "supplier" } },
      { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, supplierId: "$_id", supplierName: { $ifNull: ["$supplier.name", "Archived supplier"] }, orders: 1, orderedValue: { $round: ["$orderedValue", 2] }, receivedValue: { $round: ["$receivedValue", 2] } } },
      { $sort: { orderedValue: -1, supplierName: 1 } }, { $limit: 10 },
    ]),
    PurchaseOrder.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } }, { $sort: { status: 1 } },
    ]),
  ]);

  return sendSuccess(res, {
    message: "Dashboard summary retrieved successfully",
    data: {
      summary: totals[0] || { totalProducts: 0, totalUnits: 0, totalStockValue: 0, lowStockProducts: 0, outOfStockProducts: 0 },
      categoryBreakdown,
      recentMovements,
      purchaseAnalytics: {
        totals: purchaseTotals[0] || { orderCount: 0, orderedValue: 0, receivedValue: 0, pendingValue: 0 },
        monthly: monthlyPurchases,
        suppliers: supplierPurchases,
        statuses: orderStatuses,
      },
    },
  });
});

module.exports = { getDashboardSummary };
