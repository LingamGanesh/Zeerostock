const express = require("express");
const { getStockReport, getMovementReport } = require("../controllers/reportController");

const router = express.Router();
router.get("/stock", getStockReport);
router.get("/movements", getMovementReport);

module.exports = router;
