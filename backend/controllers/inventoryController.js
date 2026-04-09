const Inventory = require("../models/Inventory");

// Creates a new inventory item

const createInventory = async (req, res) => {
  try {
    const item = new Inventory(req.body);
    const saved = await item.save();

    // Populate supplier details in the response
    await saved.populate("supplier", "name contactEmail country");

    res.status(201).json({
      success: true,
      message: "Inventory item created successfully",
      data: saved,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, errors: messages });
    }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An item with that SKU already exists",
      });
    }
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


const getAllInventory = async (req, res) => {
  try {
    const items = await Inventory.find()
      .populate("supplier", "name contactEmail country") 
      .sort({ createdAt: -1 });                          

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


const getGroupedBySupplier = async (req, res) => {
  try {
    const grouped = await Inventory.aggregate([
      {
        $addFields: {
          lineValue: { $multiply: ["$price", "$quantity"] },
        },
      },
      {
        $group: {
          _id: "$supplier",
          totalValue: { $sum: "$lineValue" },
          totalItems: { $sum: 1 },
          totalUnits: { $sum: "$quantity" },
        },
      },
      {
        $lookup: {
          from: "suppliers",
          localField: "_id",
          foreignField: "_id",
          as: "supplierInfo",
        },
      },
      {
        $unwind: {
          path: "$supplierInfo",
          preserveNullAndEmptyArrays: true,  
        },
      },
      {
        $project: {
          _id: 0,
          supplierId: "$_id",
          supplierName: "$supplierInfo.name",
          supplierEmail: "$supplierInfo.contactEmail",
          totalValue: { $round: ["$totalValue", 2] },
          totalItems: 1,
          totalUnits: 1,
        },
      },
      {
        $sort: { totalValue: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      count: grouped.length,
      data: grouped,
    });
  } catch (error) {
    console.error("Error in getGroupedBySupplier:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


const searchInventory = async (req, res) => {
  try {
    const { product_name, minPrice, maxPrice } = req.query;

  
    const query = {};

    if (product_name && product_name.trim()) {
      
      query.product_name = { $regex: product_name.trim(), $options: "i" };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = parseFloat(minPrice);
      if (maxPrice !== undefined) query.price.$lte = parseFloat(maxPrice);
    }

    const items = await Inventory.find(query)
      .populate("supplier", "name contactEmail country")
      .sort({ product_name: 1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  createInventory,
  getAllInventory,
  getGroupedBySupplier,
  searchInventory,
};
