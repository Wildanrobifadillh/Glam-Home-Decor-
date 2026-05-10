const { z } = require("zod");

const saleReturnItemSchema = z.object({
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

  condition: z.enum(["SALEABLE", "DAMAGED"]).optional().default("SALEABLE"),

  note: z.string().trim().optional(),
});

const createSaleReturnSchema = z.object({
  saleId: z
    .string({
      required_error: "Sale is required",
    })
    .uuid("Invalid sale ID"),

  paymentMethod: z.enum(["CASH", "TRANSFER"]).optional().default("CASH"),

  cashBankAccountId: z
    .string()
    .uuid("Invalid cash/bank account ID")
    .optional(),

  note: z.string().trim().optional(),

  items: z
    .array(saleReturnItemSchema)
    .min(1, "Sale return must have at least one item")
    .refine(
      (items) => {
        const productIds = items.map((item) => item.productId);
        const uniqueProductIds = new Set(productIds);

        return productIds.length === uniqueProductIds.size;
      },
      {
        message: "Duplicate product is not allowed in one sale return",
      }
    ),
});

module.exports = {
  createSaleReturnSchema,
};