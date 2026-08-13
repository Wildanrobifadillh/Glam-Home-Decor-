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
    .positive("Selling price must be greater than 0"),
});

const saleAdditionalCostSchema = z.object({
  name: z
    .string({
      required_error: "Additional cost name is required",
    })
    .trim()
    .min(1, "Additional cost name is required"),

  amount: z.coerce
    .number({
      required_error: "Additional cost amount is required",
    })
    .int("Additional cost amount must be an integer")
    .positive("Additional cost amount must be greater than 0"),

  note: z.string().trim().optional(),
});

const createSaleSchema = z
  .object({
    customerId: z.string().uuid("Invalid customer ID").optional(),

    customerName: z.string().trim().optional(),

    customerPhone: z.string().trim().optional(),

    customerAddress: z.string().trim().optional(),

    paidAmount: z.coerce
      .number()
      .int("Paid amount must be an integer")
      .nonnegative("Paid amount cannot be negative")
      .optional()
      .default(0),

    cashReceivedAmount: z.coerce
      .number()
      .int("Cash received amount must be an integer")
      .nonnegative("Cash received amount cannot be negative")
      .optional(),

    changeAmount: z.coerce
      .number()
      .int("Change amount must be an integer")
      .nonnegative("Change amount cannot be negative")
      .optional(),

    paymentMethod: z.enum(["CASH", "TRANSFER"]).optional().default("CASH"),

    cashBankAccountId: z
      .string()
      .uuid("Invalid cash/bank account ID")
      .optional(),

    discountAmount: z.coerce
      .number()
      .int("Discount amount must be an integer")
      .nonnegative("Discount amount cannot be negative")
      .optional()
      .default(0),

    taxAmount: z.coerce
      .number()
      .int("Tax amount must be an integer")
      .nonnegative("Tax amount cannot be negative")
      .optional()
      .default(0),

    dueDate: z.coerce.date().optional(),

    additionalCosts: z.array(saleAdditionalCostSchema).optional().default([]),

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
      message:
        "Cash/bank account is required when paid amount is greater than 0",
    }
  );

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

  cashBankAccountId: z
    .string({
      required_error: "Cash/bank account is required",
    })
    .uuid("Invalid cash/bank account ID"),

  note: z.string().trim().optional(),
});

const cancelSaleSchema = z.object({
  reason: z
    .string({
      required_error: "Cancellation reason is required",
    })
    .trim()
    .min(3, "Cancellation reason must be at least 3 characters")
    .max(500, "Cancellation reason must not exceed 500 characters"),
});

module.exports = {
  createSaleSchema,
  approveSaleSchema,
  rejectSaleSchema,
  paySaleSchema,
  cancelSaleSchema,
};