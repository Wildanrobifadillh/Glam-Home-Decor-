const { z } = require("zod");

const purchaseReturnItemSchema = z.object({
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

const createPurchaseReturnSchema = z.object({
  purchaseId: z
    .string({
      required_error: "Purchase is required",
    })
    .uuid("Invalid purchase ID"),

  note: z.string().trim().optional(),

  items: z
    .array(purchaseReturnItemSchema)
    .min(1, "Purchase return must have at least one item")
    .refine(
      (items) => {
        const productIds = items.map((item) => item.productId);
        const uniqueProductIds = new Set(productIds);

        return productIds.length === uniqueProductIds.size;
      },
      {
        message: "Duplicate product is not allowed in one purchase return",
      }
    ),
});

module.exports = {
  createPurchaseReturnSchema,
};