const { z } = require("zod");

const accountTypeSchema = z.enum([
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "COGS",
  "EXPENSE",
]);

const normalBalanceSchema = z.enum(["DEBIT", "CREDIT"]);

const createAccountSchema = z.object({
  code: z
    .string({
      required_error: "Account code is required",
    })
    .trim()
    .min(1, "Account code is required"),

  name: z
    .string({
      required_error: "Account name is required",
    })
    .trim()
    .min(1, "Account name is required"),

  type: accountTypeSchema,

  normalBalance: normalBalanceSchema.optional(),

  parentId: z.string().uuid("Invalid parent account ID").nullable().optional(),
});

const updateAccountSchema = z.object({
  code: z.string().trim().min(1, "Account code is required").optional(),

  name: z.string().trim().min(1, "Account name is required").optional(),

  type: accountTypeSchema.optional(),

  normalBalance: normalBalanceSchema.optional(),

  parentId: z.string().uuid("Invalid parent account ID").nullable().optional(),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

module.exports = {
  createAccountSchema,
  updateAccountSchema,
};