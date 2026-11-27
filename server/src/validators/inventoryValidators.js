const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\\d]{24}$/i, "Must be a valid ID");
const createInventorySchema = z.object({
  product_name: z.string().trim().min(2).max(150),
  sku: z.string().trim().min(2).max(64).transform((value) => value.toUpperCase()),
  category: z.string().trim().min(2).max(80).default("General"),
  quantity: z.coerce.number().int().min(0).default(0),
  price: z.coerce.number().finite().positive(),
  supplier: objectId,
  description: z.string().trim().max(500).optional().default(""),
}).strict();

const updateInventorySchema = z.object({
  product_name: z.string().trim().min(2).max(150).optional(),
  category: z.string().trim().min(2).max(80).optional(),
  price: z.coerce.number().finite().positive().optional(),
  supplier: objectId.optional(),
  description: z.string().trim().max(500).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one editable field is required",
});

const stockAdjustmentSchema = z.object({
  direction: z.enum(["in", "out", "set"]),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(250),
  reference: z.string().trim().max(100).optional().default(""),
}).strict();

module.exports = {
  createInventorySchema,
  updateInventorySchema,
  stockAdjustmentSchema,
};
