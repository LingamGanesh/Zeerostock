const express = require("express");
const { getDashboardSummary } = require("../controllers/dashboardController");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.get("/summary", asyncHandler(getDashboardSummary));

module.exports = router;
