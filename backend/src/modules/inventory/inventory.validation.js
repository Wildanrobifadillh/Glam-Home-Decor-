const { z } = require("zod");

const stockInSchema = z.object({
  productId: z
    .string({
      required_error: "Product is required",
    })
    .uuid("Invalid product ID"),

  quantity: z.coerce
    .number({
      required_error: "Quantity is required",
    })
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than 0"),

  note: z.string().trim().optional(),
});

const stockOutSchema = z.object({
  productId: z
    .string({
      required_error: "Product is required",
    })
    .uuid("Invalid product ID"),

  quantity: z.coerce
    .number({
      required_error: "Quantity is required",
    })
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than 0"),

  note: z.string().trim().optional(),
});

const stockAdjustmentSchema = z.object({
  productId: z
    .string({
      required_error: "Product is required",
    })
    .uuid("Invalid product ID"),

  newStock: z.coerce
    .number({
      required_error: "New stock is required",
    })
    .int("New stock must be an integer")
    .nonnegative("New stock cannot be negative"),

  note: z.string().trim().min(1, "Adjustment note is required"),
});

const damagedStockSchema = z.object({
  productId: z
    .string({
      required_error: "Product is required",
    })
    .uuid("Invalid product ID"),

  quantity: z.coerce
    .number({
      required_error: "Quantity is required",
    })
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than 0"),

  note: z.string().trim().min(1, "Damage note is required"),
});

module.exports = {
  stockInSchema,
  stockOutSchema,
  stockAdjustmentSchema,
  damagedStockSchema,
};