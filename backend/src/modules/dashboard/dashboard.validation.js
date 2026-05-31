const { z } = require("zod");

const getOwnerDashboardSchema = z.object({
  periodType: z.enum(["DAY", "MONTH", "YEAR"]).optional().default("MONTH"),
  date: z.coerce.date().optional(),
});

module.exports = {
  getOwnerDashboardSchema,
};