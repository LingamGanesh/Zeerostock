const express = require("express");
const {
  listPurchaseOrders,
  createPurchaseOrder,
  approvePurchaseOrder,
  receivePurchaseOrder,
} = require("../controllers/purchaseOrderController");

const router = express.Router();
router.route("/").get(listPurchaseOrders).post(createPurchaseOrder);
router.post("/:id/approve", approvePurchaseOrder);
router.post("/:id/receive", receivePurchaseOrder);
module.exports = router;
