const { z } = require("zod");

const saleItemSchema = z.object({
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

  sellingPrice: z.coerce
    .number({
      required_error: "Selling price is required",
    })
    .int("Selling price must be an integer")
    .nonnegative("Selling price cannot be negative"),
});

const createSaleSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID").optional(),

  customerName: z.string().trim().optional(),

  customerPhone: z.string().trim().optional(),

  paidAmount: z.coerce
    .number()
    .int("Paid amount must be an integer")
    .nonnegative("Paid amount cannot be negative")
    .optional()
    .default(0),

  paymentMethod: z.enum(["CASH", "TRANSFER"]).optional().default("CASH"),

  note: z.string().trim().optional(),

  items: z
    .array(saleItemSchema)
    .min(1, "Sale must have at least one item")
    .refine(
      (items) => {
        const productIds = items.map((item) => item.productId);
        const uniqueProductIds = new Set(productIds);

        return productIds.length === uniqueProductIds.size;
      },
      {
        message: "Duplicate product is not allowed in one sale",
      }
    ),
});

const approveSaleSchema = z.object({
  note: z.string().trim().optional(),
});

const rejectSaleSchema = z.object({
  note: z.string().trim().optional(),
});

const paySaleSchema = z.object({
  amount: z.coerce
    .number({
      required_error: "Payment amount is required",
    })
    .int("Payment amount must be an integer")
    .positive("Payment amount must be greater than 0"),

  paymentMethod: z.enum(["CASH", "TRANSFER"]).optional().default("CASH"),

  note: z.string().trim().optional(),
});

module.exports = {
  createSaleSchema,
  approveSaleSchema,
  rejectSaleSchema,
  paySaleSchema,
};