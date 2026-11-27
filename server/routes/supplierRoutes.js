

const express = require("express");
const router = express.Router();
const { createSupplier } = require("../controllers/supplierController");

// POST /supplier  →  Create a new supplier
router.post("/", createSupplier);

module.exports = router;
