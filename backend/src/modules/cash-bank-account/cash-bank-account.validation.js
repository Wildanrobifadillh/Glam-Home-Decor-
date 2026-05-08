const { z } = require("zod");

const cashBankTypeSchema = z.enum(["CASH", "BANK"]);

const createCashBankAccountSchema = z.object({
  accountId: z
    .string({
      required_error: "Account is required",
    })
    .uuid("Invalid account ID"),

  name: z
    .string({
      required_error: "Cash/bank account name is required",
    })
    .trim()
    .min(1, "Cash/bank account name is required"),

  type: cashBankTypeSchema,

  bankName: z.string().trim().optional(),

  accountNumber: z.string().trim().optional(),

  currentBalance: z.coerce
    .number()
    .int("Current balance must be an integer")
    .nonnegative("Current balance cannot be negative")
    .optional()
    .default(0),
});

const updateCashBankAccountSchema = z.object({
  accountId: z.string().uuid("Invalid account ID").optional(),

  name: z.string().trim().min(1, "Cash/bank account name is required").optional(),

  type: cashBankTypeSchema.optional(),

  bankName: z.string().trim().optional(),

  accountNumber: z.string().trim().optional(),

  currentBalance: z.coerce
    .number()
    .int("Current balance must be an integer")
    .nonnegative("Current balance cannot be negative")
    .optional(),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

module.exports = {
  createCashBankAccountSchema,
  updateCashBankAccountSchema,
};