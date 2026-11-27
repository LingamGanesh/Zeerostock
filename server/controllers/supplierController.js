

const Supplier = require("../models/Supplier");


// Creates a new supplier record

const createSupplier = async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    const saved = await supplier.save();

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: saved,
    });
  } catch (error) {
    // Handle Mongoose validation errors gracefully
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, errors: messages });
    }
    // Handle duplicate key 
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A supplier with that email already exists",
      });
    }
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = { createSupplier };
