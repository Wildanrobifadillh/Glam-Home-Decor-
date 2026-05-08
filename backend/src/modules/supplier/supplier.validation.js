const { z } = require("zod");

const createSupplierSchema = z.object({
  name: z
    .string({
      required_error: "Supplier name is required",
    })
    .trim()
    .min(1, "Supplier name is required"),

  phone: z.string().trim().optional(),

  address: z.string().trim().optional(),
});

const updateSupplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").optional(),

  phone: z.string().trim().optional(),

  address: z.string().trim().optional(),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

module.exports = {
  createSupplierSchema,
  updateSupplierSchema,
};