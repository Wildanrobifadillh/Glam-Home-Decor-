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

const createSettingsUserSchema = z.object({
  name: z
    .string({
      required_error: "Name is required",
    })
    .trim()
    .min(1, "Name is required"),

  username: z
    .string({
      required_error: "Username is required",
    })
    .trim()
    .min(3, "Username must be at least 3 characters"),

  password: z
    .string({
      required_error: "Password is required",
    })
    .min(6, "Password must be at least 6 characters"),

  role: z.enum(["OWNER", "ADMIN_STAFF", "STAFF_GUDANG"], {
    required_error: "Role is required",
    invalid_type_error: "Invalid role",
  }),
});

const updateSettingsUserSchema = z.object({
  name: z
    .string({
      required_error: "Name is required",
    })
    .trim()
    .min(1, "Name is required"),

  username: z
    .string({
      required_error: "Username is required",
    })
    .trim()
    .min(3, "Username must be at least 3 characters"),
});

const updateSettingsUserRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN_STAFF", "STAFF_GUDANG"], {
    required_error: "Role is required",
    invalid_type_error: "Invalid role",
  }),
});

const updateSettingsUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"], {
    required_error: "Status is required",
    invalid_type_error: "Invalid status",
  }),
});

const resetSettingsUserPasswordSchema = z.object({
  password: z
    .string({
      required_error: "Password is required",
    })
    .min(6, "Password must be at least 6 characters"),
});

const updateSettingsEmployeeSchema = z.object({
  name: z
    .string({
      required_error: "Employee name is required",
    })
    .trim()
    .min(1, "Employee name is required"),

  phone: z.string().trim().optional(),

  address: z.string().trim().optional(),

  position: z
    .string({
      required_error: "Position is required",
    })
    .trim()
    .min(1, "Position is required"),

  baseSalary: z.coerce
    .number({
      required_error: "Base salary is required",
    })
    .int("Base salary must be an integer")
    .nonnegative("Base salary cannot be negative"),

  joinedAt: z.coerce.date().optional(),
});

const updateSettingsEmployeeStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"], {
    required_error: "Status is required",
    invalid_type_error: "Invalid status",
  }),
});

const linkSettingsEmployeeUserSchema = z.object({
  userId: z
    .string({
      required_error: "User is required",
    })
    .uuid("Invalid user ID"),
});

const updateRolePermissionsSchema = z.object({
  moduleKeys: z
    .array(z.string().trim().min(1, "Module key is required"), {
      required_error: "Module keys are required",
    })
    .default([]),
});

const changePasswordSchema = z.object({
  oldPassword: z
    .string({
      required_error: "Old password is required",
    })
    .min(1, "Old password is required"),

  newPassword: z
    .string({
      required_error: "New password is required",
    })
    .min(6, "New password must be at least 6 characters"),
});

const updateOperationalPreferencesSchema = z.object({
  defaultReceivableDueDays: z.coerce
    .number({
      required_error: "Default receivable due days is required",
    })
    .int("Default receivable due days must be an integer")
    .nonnegative("Default receivable due days cannot be negative"),

  defaultPayableDueDays: z.coerce
    .number({
      required_error: "Default payable due days is required",
    })
    .int("Default payable due days must be an integer")
    .nonnegative("Default payable due days cannot be negative"),

  defaultPaymentMethod: z.enum(["CASH", "TRANSFER"], {
    required_error: "Default payment method is required",
    invalid_type_error: "Invalid payment method",
  }),

  defaultCashBankAccountId: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().uuid("Invalid cash/bank account ID").nullable().optional()
  ),

  requireReceivableApproval: z.coerce.boolean({
    required_error: "Require receivable approval is required",
  }),
});

const updateDocumentSettingSchema = z.object({
  documentLanguage: z.enum(["ID", "EN"], {
    required_error: "Document language is required",
    invalid_type_error: "Invalid document language",
  }),

  salesInvoicePrefix: z
    .string({
      required_error: "Sales invoice prefix is required",
    })
    .trim()
    .min(1, "Sales invoice prefix is required"),

  salesReturnPrefix: z
    .string({
      required_error: "Sales return prefix is required",
    })
    .trim()
    .min(1, "Sales return prefix is required"),

  purchaseReturnPrefix: z
    .string({
      required_error: "Purchase return prefix is required",
    })
    .trim()
    .min(1, "Purchase return prefix is required"),

  payrollSlipPrefix: z
    .string({
      required_error: "Payroll slip prefix is required",
    })
    .trim()
    .min(1, "Payroll slip prefix is required"),

  reportPrefix: z
    .string({
      required_error: "Report prefix is required",
    })
    .trim()
    .min(1, "Report prefix is required"),

  deliveryOrderPrefix: z.string().trim().optional(),

  resetNumberMonthly: z.coerce.boolean({
    required_error: "Reset number monthly is required",
  }),

  defaultPaperSize: z.enum(["F4", "A4"], {
    required_error: "Default paper size is required",
    invalid_type_error: "Invalid default paper size",
  }),

  alternatePaperSize: z.enum(["F4", "A4"], {
    required_error: "Alternate paper size is required",
    invalid_type_error: "Invalid alternate paper size",
  }),

  invoiceCopies: z.coerce
    .number({
      required_error: "Invoice copies is required",
    })
    .int("Invoice copies must be an integer")
    .positive("Invoice copies must be greater than 0"),

  maxItemsF4: z.coerce
    .number({
      required_error: "Max items F4 is required",
    })
    .int("Max items F4 must be an integer")
    .positive("Max items F4 must be greater than 0"),

  maxItemsA4: z.coerce
    .number({
      required_error: "Max items A4 is required",
    })
    .int("Max items A4 must be an integer")
    .positive("Max items A4 must be greater than 0"),

  copyLabel1: z
    .string({
      required_error: "Copy label 1 is required",
    })
    .trim()
    .min(1, "Copy label 1 is required"),

  copyLabel2: z
    .string({
      required_error: "Copy label 2 is required",
    })
    .trim()
    .min(1, "Copy label 2 is required"),

  copyLabel3: z
    .string({
      required_error: "Copy label 3 is required",
    })
    .trim()
    .min(1, "Copy label 3 is required"),

  thankYouNote: z.string().trim().optional(),
  transactionProofNote: z.string().trim().optional(),
  complaintTerms: z.string().trim().optional(),
  returnTerms: z.string().trim().optional(),
  paymentTerms: z.string().trim().optional(),
  additionalNote: z.string().trim().optional(),

  responsiblePersonName: z
    .string({
      required_error: "Responsible person name is required",
    })
    .trim()
    .min(1, "Responsible person name is required"),

  responsiblePersonTitle: z
    .string({
      required_error: "Responsible person title is required",
    })
    .trim()
    .min(1, "Responsible person title is required"),

  showSignature: z.coerce.boolean({
    required_error: "Show signature is required",
  }),

  signatureUrl: z.string().trim().optional(),

  showStamp: z.coerce.boolean({
    required_error: "Show stamp is required",
  }),

  stampUrl: z.string().trim().optional(),

  signatureText: z
    .string({
      required_error: "Signature text is required",
    })
    .trim()
    .min(1, "Signature text is required"),
});

module.exports = {
  updateStoreProfileSchema,
  createStoreBankAccountSchema,
  updateStoreBankAccountSchema,
  updateStoreBankAccountStatusSchema,
  createSettingsUserSchema,
  updateSettingsUserSchema,
  updateSettingsUserRoleSchema,
  updateSettingsUserStatusSchema,
  resetSettingsUserPasswordSchema,
  updateSettingsEmployeeSchema,
  updateSettingsEmployeeStatusSchema,
  linkSettingsEmployeeUserSchema,
  updateRolePermissionsSchema,
  changePasswordSchema,
  updateOperationalPreferencesSchema,
  updateDocumentSettingSchema,
};