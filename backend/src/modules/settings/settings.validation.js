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
};