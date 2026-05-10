const { z } = require("zod");

const createPayrollSchema = z.object({
  employeeId: z
    .string({
      required_error: "Employee is required",
    })
    .uuid("Invalid employee ID"),

  periodMonth: z.coerce
    .number({
      required_error: "Period month is required",
    })
    .int("Period month must be an integer")
    .min(1, "Period month must be between 1 and 12")
    .max(12, "Period month must be between 1 and 12"),

  periodYear: z.coerce
    .number({
      required_error: "Period year is required",
    })
    .int("Period year must be an integer")
    .min(2000, "Period year is invalid"),

  baseSalary: z.coerce
    .number()
    .int("Base salary must be an integer")
    .positive("Base salary must be greater than 0")
    .optional(),

  allowance: z.coerce
    .number()
    .int("Allowance must be an integer")
    .nonnegative("Allowance cannot be negative")
    .optional()
    .default(0),

  deduction: z.coerce
    .number()
    .int("Deduction must be an integer")
    .nonnegative("Deduction cannot be negative")
    .optional()
    .default(0),

  bonus: z.coerce
    .number()
    .int("Bonus must be an integer")
    .nonnegative("Bonus cannot be negative")
    .optional()
    .default(0),

  paymentMethod: z.enum(["CASH", "TRANSFER"]).optional().default("CASH"),

  cashBankAccountId: z
    .string({
      required_error: "Cash/bank account is required",
    })
    .uuid("Invalid cash/bank account ID"),

  paidAt: z.coerce.date().optional(),

  note: z.string().trim().optional(),
});

module.exports = {
  createPayrollSchema,
};