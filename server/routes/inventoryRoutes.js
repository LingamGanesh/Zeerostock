// routes/inventoryRoutes.js
// Mounts inventory endpoints on the Express router
// ORDER MATTERS: specific paths before parameterized ones

const express = require("express");
const router = express.Router();
const {
  createInventory,
  getAllInventory,
  getGroupedBySupplier,
  searchInventory,
} = require("../controllers/inventoryController");

// GET /inventory/grouped  →  Total value per supplier (aggregation)
router.get("/grouped", getGroupedBySupplier);

// GET /inventory/search   →  Filter by product_name, minPrice, maxPrice
router.get("/search", searchInventory);

// GET /inventory           →  List all inventory items
router.get("/", getAllInventory);

// POST /inventory          →  Create a new inventory item
router.post("/", createInventory);

module.exports = router;
