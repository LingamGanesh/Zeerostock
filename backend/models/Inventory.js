

const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
      maxlength: [150, "Product name cannot exceed 150 characters"],
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "General",
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",        
      required: [true, "Supplier reference is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: total stock value = price × quantity
inventorySchema.virtual("totalValue").get(function () {
  return parseFloat((this.price * this.quantity).toFixed(2));
});

// Index for faster search by product_name
inventorySchema.index({ product_name: "text" });

module.exports = mongoose.model("Inventory", inventorySchema);
