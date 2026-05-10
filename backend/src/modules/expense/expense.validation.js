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

module.exports = {
  createExpenseSchema,
};