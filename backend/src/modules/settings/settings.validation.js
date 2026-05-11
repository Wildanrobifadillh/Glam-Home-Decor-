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

module.exports = {
  updateStoreProfileSchema,
};