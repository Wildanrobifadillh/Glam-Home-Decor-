const { z } = require("zod");

const createExpenseSchema = z.object({
  expenseDate: z.coerce.date().optional(),

  accountId: z
    .string({
      required_error: "Expense account is required",
    })
    .uuid("Invalid expense account ID"),

  cashBankAccountId: z
    .string({
      required_error: "Cash/bank account is required",
    })
    .uuid("Invalid cash/bank account ID"),

  amount: z.coerce
    .number({
      required_error: "Amount is required",
    })
    .int("Amount must be an integer")
    .positive("Amount must be greater than 0"),

  paymentMethod: z.enum(["CASH", "TRANSFER"]).optional().default("CASH"),

  description: z
    .string({
      required_error: "Description is required",
    })
    .trim()
    .min(1, "Description is required"),

  note: z.string().trim().optional(),
});

const cancelExpenseSchema = z.object({
  reason: z
    .string({
      required_error: "Cancellation reason is required",
    })
    .trim()
    .min(3, "Cancellation reason must be at least 3 characters")
    .max(500, "Cancellation reason must not exceed 500 characters"),
});

module.exports = {
  createExpenseSchema,
  cancelExpenseSchema,
};
