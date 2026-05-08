const { z } = require("zod");

const createProductSchema = z.object({
  supplierCode: z
    .string({
      required_error: "Supplier code is required",
    })
    .trim()
    .min(1, "Supplier code is required"),

  name: z
    .string({
      required_error: "Product name is required",
    })
    .trim()
    .min(1, "Product name is required"),

  categoryId: z
    .string({
      required_error: "Category is required",
    })
    .uuid("Invalid category ID"),

  unit: z
    .string({
      required_error: "Unit is required",
    })
    .trim()
    .min(1, "Unit is required"),

  purchasePrice: z.coerce
    .number({
      required_error: "Purchase price is required",
    })
    .int("Purchase price must be an integer")
    .nonnegative("Purchase price cannot be negative"),

  sellingPrice: z.coerce
    .number()
    .int("Selling price must be an integer")
    .nonnegative("Selling price cannot be negative")
    .optional()
    .default(0),

  minStock: z.coerce
    .number()
    .int("Minimum stock must be an integer")
    .nonnegative("Minimum stock cannot be negative")
    .optional()
    .default(0),

  stock: z.coerce
    .number()
    .int("Stock must be an integer")
    .nonnegative("Stock cannot be negative")
    .optional()
    .default(0),
});

const updateProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").optional(),

  categoryId: z.string().uuid("Invalid category ID").optional(),

  unit: z.string().trim().min(1, "Unit is required").optional(),

  purchasePrice: z.coerce
    .number()
    .int("Purchase price must be an integer")
    .nonnegative("Purchase price cannot be negative")
    .optional(),

  sellingPrice: z.coerce
    .number()
    .int("Selling price must be an integer")
    .nonnegative("Selling price cannot be negative")
    .optional(),

  minStock: z.coerce
    .number()
    .int("Minimum stock must be an integer")
    .nonnegative("Minimum stock cannot be negative")
    .optional(),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
};