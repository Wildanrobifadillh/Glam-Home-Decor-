const { z } = require("zod");

const journalLineSchema = z
  .object({
    accountId: z
      .string({
        required_error: "Account is required",
      })
      .uuid("Invalid account ID"),

    debit: z.coerce
      .number()
      .int("Debit must be an integer")
      .nonnegative("Debit cannot be negative")
      .optional()
      .default(0),

    credit: z.coerce
      .number()
      .int("Credit must be an integer")
      .nonnegative("Credit cannot be negative")
      .optional()
      .default(0),

    note: z.string().trim().optional(),
  })
  .refine(
    (line) => {
      return !(line.debit > 0 && line.credit > 0);
    },
    {
      message: "One journal line cannot have both debit and credit",
    }
  )
  .refine(
    (line) => {
      return line.debit > 0 || line.credit > 0;
    },
    {
      message: "One journal line must have debit or credit amount",
    }
  );

const createJournalEntrySchema = z
  .object({
    entryDate: z.coerce.date().optional(),

    description: z.string().trim().optional(),

    sourceType: z
      .enum([
        "MANUAL",
        "SALE",
        "PURCHASE",
        "RECEIVABLE_PAYMENT",
        "PAYABLE_PAYMENT",
        "EXPENSE",
        "PAYROLL",
        "SALE_RETURN",
        "PURCHASE_RETURN",
        "STOCK_OPNAME",
      ])
      .optional()
      .default("MANUAL"),

    sourceId: z.string().uuid("Invalid source ID").optional(),

    lines: z.array(journalLineSchema).min(2, "Journal entry must have at least two lines"),
  })
  .refine(
    (data) => {
      const totalDebit = data.lines.reduce((total, line) => total + line.debit, 0);
      const totalCredit = data.lines.reduce((total, line) => total + line.credit, 0);

      return totalDebit === totalCredit;
    },
    {
      message: "Total debit and credit must be balanced",
    }
  );

  const reverseJournalEntrySchema = z.object({
  note: z.string().trim().optional(),
});

module.exports = {
  createJournalEntrySchema,
  reverseJournalEntrySchema,
};