const { z } = require("zod");

const purchaseItemSchema = z.object({
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

  purchasePrice: z.coerce
    .number({
      required_error: "Purchase price is required",
    })
    .int("Purchase price must be an integer")
    .positive("Purchase price must be greater than 0"),
});

const createPurchaseSchema = z
  .object({
    supplierId: z
      .string({
        required_error: "Supplier is required",
      })
      .uuid("Invalid supplier ID"),

    supplierInvoiceNumber: z.string().trim().optional(),

    paidAmount: z.coerce
      .number()
      .int("Paid amount must be an integer")
      .nonnegative("Paid amount cannot be negative")
      .optional()
      .default(0),

    paymentMethod: z.enum(["CASH", "TRANSFER"]).optional().default("CASH"),

    cashBankAccountId: z
      .string()
      .uuid("Invalid cash/bank account ID")
      .optional(),

    note: z.string().trim().optional(),

    items: z
      .array(purchaseItemSchema)
      .min(1, "Purchase must have at least one item")
      .refine(
        (items) => {
          const productIds = items.map((item) => item.productId);
          const uniqueProductIds = new Set(productIds);

          return productIds.length === uniqueProductIds.size;
        },
        {
          message: "Duplicate product is not allowed in one purchase",
        }
      ),
  })
  .refine(
    (data) => {
      if (data.paidAmount > 0) {
        return Boolean(data.cashBankAccountId);
      }

      return true;
    },
    {
      field: "cashBankAccountId",
      message: "Cash/bank account is required when paid amount is greater than 0",
    }
  );

const payPurchaseSchema = z.object({
  amount: z.coerce
    .number({
      required_error: "Payment amount is required",
    })
    .int("Payment amount must be an integer")
    .positive("Payment amount must be greater than 0"),

  paymentMethod: z.enum(["CASH", "TRANSFER"]).optional().default("CASH"),

  cashBankAccountId: z
    .string({
      required_error: "Cash/bank account is required",
    })
    .uuid("Invalid cash/bank account ID"),

  note: z.string().trim().optional(),
});

module.exports = {
  createPurchaseSchema,
  payPurchaseSchema,
};