const mongoose = require("mongoose");
const { z } = require("zod");
const Supplier = require("../models/Supplier");
const Inventory = require("../models/Inventory");
const asyncHandler = require("../src/utils/asyncHandler");

const supplierSchema = z.object({
  name: z.string().trim().min(2).max(100),
  contactEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/).optional().or(z.literal("")),
  address: z.string().trim().max(250).optional().default(""),
  country: z.string().trim().min(2).max(80).optional().default("India"),
}).strict();

const listSuppliers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 80);
  const filter = { isActive: { $ne: false } };
  if (q) {
    const escaped = q.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: { $regex: escaped, $options: "i" } }, { contactEmail: { $regex: escaped, $options: "i" } }];
  }
  const suppliers = await Supplier.find(filter).select("name contactEmail phone address country createdAt updatedAt").sort({ name: 1 }).lean();
  res.status(200).json({ success: true, message: "Suppliers retrieved successfully", data: suppliers, errors: [] });
});

const createSupplier = asyncHandler(async (req, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Supplier validation failed", data: null, errors: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) });
  const duplicate = await Supplier.exists({ contactEmail: parsed.data.contactEmail, isActive: { $ne: false } });
  if (duplicate) return res.status(409).json({ success: false, message: "A supplier with this email already exists", data: null, errors: [] });
  const supplier = await Supplier.create(parsed.data);
  res.status(201).json({ success: true, message: "Supplier created successfully", data: supplier, errors: [] });
});

const updateSupplier = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid supplier ID", data: null, errors: [] });
  const parsed = supplierSchema.partial().strict().safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data || {}).length === 0) return res.status(400).json({ success: false, message: "Provide valid supplier fields to update", data: null, errors: parsed.success ? [] : parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) });
  if (parsed.data.contactEmail) {
    const duplicate = await Supplier.exists({ _id: { $ne: req.params.id }, contactEmail: parsed.data.contactEmail, isActive: { $ne: false } });
    if (duplicate) return res.status(409).json({ success: false, message: "A supplier with this email already exists", data: null, errors: [] });
  }
  const supplier = await Supplier.findOneAndUpdate({ _id: req.params.id, isActive: { $ne: false } }, { $set: parsed.data }, { new: true, runValidators: true });
  if (!supplier) return res.status(404).json({ success: false, message: "Active supplier not found", data: null, errors: [] });
  res.status(200).json({ success: true, message: "Supplier updated successfully", data: supplier, errors: [] });
});

const archiveSupplier = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid supplier ID", data: null, errors: [] });
  const supplier = await Supplier.findOne({ _id: req.params.id, isActive: { $ne: false } });
  if (!supplier) return res.status(404).json({ success: false, message: "Active supplier not found", data: null, errors: [] });
  const linkedProducts = await Inventory.countDocuments({ supplier: supplier._id, isActive: { $ne: false } });
  if (linkedProducts > 0) return res.status(409).json({ success: false, message: "Cannot archive a supplier linked to active inventory. Reassign or archive those products first.", data: { linkedProducts }, errors: [] });
  supplier.isActive = false;
  await supplier.save();
  res.status(200).json({ success: true, message: "Supplier archived successfully", data: { id: supplier._id, isActive: false }, errors: [] });
});

module.exports = { listSuppliers, createSupplier, updateSupplier, archiveSupplier };
