const { z } = require("zod");

const createCustomerSchema = z.object({
  name: z
    .string({
      required_error: "Customer name is required",
    })
    .trim()
    .min(1, "Customer name is required"),

  phone: z.string().trim().optional(),

  address: z.string().trim().optional(),

  type: z.enum(["GENERAL", "PROJECT", "RESELLER"]).optional().default("GENERAL"),
});

const updateCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").optional(),

  phone: z.string().trim().optional(),

  address: z.string().trim().optional(),

  type: z.enum(["GENERAL", "PROJECT", "RESELLER"]).optional(),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
};