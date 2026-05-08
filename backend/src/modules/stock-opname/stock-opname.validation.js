const { z } = require("zod");

const stockOpnameItemSchema = z.object({
  productId: z
    .string({
      required_error: "Product is required",
    })
    .uuid("Invalid product ID"),

  physicalStock: z.coerce
    .number({
      required_error: "Physical stock is required",
    })
    .int("Physical stock must be an integer")
    .nonnegative("Physical stock cannot be negative"),

  note: z.string().trim().optional(),
});

const createStockOpnameSchema = z.object({
  note: z.string().trim().optional(),

  items: z
    .array(stockOpnameItemSchema)
    .min(1, "Stock opname must have at least one item")
    .refine(
      (items) => {
        const productIds = items.map((item) => item.productId);
        const uniqueProductIds = new Set(productIds);

        return productIds.length === uniqueProductIds.size;
      },
      {
        message: "Duplicate product is not allowed in one stock opname",
      }
    ),
});

module.exports = {
  createStockOpnameSchema,
};