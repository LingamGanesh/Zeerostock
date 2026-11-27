const Supplier = require("../models/Supplier");

// Returns suppliers for authenticated inventory managers.
const listSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({})
      .select("name contactEmail phone country")
      .sort({ name: 1 })
      .lean();
    return res.status(200).json({
      success: true,
      message: "Suppliers retrieved successfully",
      data: suppliers,
      errors: [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve suppliers",
      data: null,
      errors: [],
    });
  }
};

// Creates a new supplier record.
const createSupplier = async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    const saved = await supplier.save();
    return res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: saved,
      errors: [],
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((entry) => entry.message);
      return res.status(400).json({ success: false, message: "Supplier validation failed", data: null, errors: messages });
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "A supplier with that email already exists", data: null, errors: [] });
    }
    return res.status(500).json({ success: false, message: "Server error", data: null, errors: [] });
  }
};

module.exports = { listSuppliers, createSupplier };
