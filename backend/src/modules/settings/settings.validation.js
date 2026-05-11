const { z } = require("zod");

const updateStoreProfileSchema = z.object({
  name: z
    .string({
      required_error: "Store name is required",
    })
    .trim()
    .min(1, "Store name is required"),

  legalName: z.string().trim().optional(),
  brandShortName: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  website: z.string().trim().optional(),
  socialMedia: z.string().trim().optional(),
  logoUrl: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  businessNumber: z.string().trim().optional(),
});

const createStoreBankAccountSchema = z.object({
  accountId: z
    .string({
      required_error: "Account is required",
    })
    .uuid("Invalid account ID"),

  name: z
    .string({
      required_error: "Bank account name is required",
    })
    .trim()
    .min(1, "Bank account name is required"),

  bankName: z
    .string({
      required_error: "Bank name is required",
    })
    .trim()
    .min(1, "Bank name is required"),

  accountNumber: z
    .string({
      required_error: "Account number is required",
    })
    .trim()
    .min(1, "Account number is required"),

  accountHolderName: z
    .string({
      required_error: "Account holder name is required",
    })
    .trim()
    .min(1, "Account holder name is required"),

  isDefaultForInvoice: z.coerce.boolean().optional().default(false),
});

const updateStoreBankAccountSchema = createStoreBankAccountSchema;

const updateStoreBankAccountStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"], {
    required_error: "Status is required",
    invalid_type_error: "Invalid status",
  }),
});

module.exports = {
  updateStoreProfileSchema,
  createStoreBankAccountSchema,
  updateStoreBankAccountSchema,
  updateStoreBankAccountStatusSchema,
};