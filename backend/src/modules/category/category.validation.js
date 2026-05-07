const { z } = require("zod");

const createCategorySchema = z.object({
  name: z
    .string({
      required_error: "Category name is required",
    })
    .trim()
    .min(1, "Category name is required"),
});

const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};