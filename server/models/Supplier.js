const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Supplier name is required"], trim: true, minlength: 2, maxlength: 100 },
  contactEmail: { type: String, required: [true, "Contact email is required"], trim: true, lowercase: true, match: /^\S+@\S+\.\S+$/ },
  phone: { type: String, trim: true, match: /^[0-9+\-\s()]{7,20}$/ },
  address: { type: String, trim: true, maxlength: 250 },
  country: { type: String, trim: true, default: "India" },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

supplierSchema.index({ name: 1, isActive: 1 });
module.exports = mongoose.model("Supplier", supplierSchema);
