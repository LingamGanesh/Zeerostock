const express = require("express");
const router = express.Router();
const { listSuppliers, createSupplier } = require("../controllers/supplierController");

router.get("/", listSuppliers);
router.post("/", createSupplier);

module.exports = router;
