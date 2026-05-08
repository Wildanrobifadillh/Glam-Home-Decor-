const { z } = require("zod");

const createEmployeeSchema = z.object({
  userId: z.string().uuid("Invalid user ID").optional(),

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
    .number()
    .int("Base salary must be an integer")
    .nonnegative("Base salary cannot be negative")
    .optional()
    .default(0),

  joinedAt: z.coerce.date().optional(),
});

const updateEmployeeSchema = z.object({
  userId: z.string().uuid("Invalid user ID").optional(),

  name: z.string().trim().min(1, "Employee name is required").optional(),

  phone: z.string().trim().optional(),

  address: z.string().trim().optional(),

  position: z.string().trim().min(1, "Position is required").optional(),

  baseSalary: z.coerce
    .number()
    .int("Base salary must be an integer")
    .nonnegative("Base salary cannot be negative")
    .optional(),

  joinedAt: z.coerce.date().optional(),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

module.exports = {
  createEmployeeSchema,
  updateEmployeeSchema,
};