const express = require("express");
const { listSuppliers, createSupplier, updateSupplier, archiveSupplier } = require("../controllers/supplierController");
const router = express.Router();

router.route("/").get(listSuppliers).post(createSupplier);
router.route("/:id").patch(updateSupplier).delete(archiveSupplier);

module.exports = router;
