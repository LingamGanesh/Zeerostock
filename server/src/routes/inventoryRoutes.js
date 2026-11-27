const express = require("express");
const {
  listInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  adjustInventoryStock,
  getInventoryMovements,
} = require("../controllers/inventoryController");

const router = express.Router();

router.route("/")
  .get(listInventory)
  .post(createInventoryItem);

router.get("/:id/movements", getInventoryMovements);
router.post("/:id/adjustments", adjustInventoryStock);
router.route("/:id")
  .get(getInventoryItem)
  .patch(updateInventoryItem);

module.exports = router;
