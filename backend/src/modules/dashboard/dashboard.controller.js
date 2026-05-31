const dashboardService = require("./dashboard.service");
const { getOwnerDashboardSchema } = require("./dashboard.validation");

const getOwnerDashboard = async (req, res, next) => {
  try {
    const validatedQuery = getOwnerDashboardSchema.parse({
      periodType: req.query.periodType,
      date: req.query.date,
    });

    const dashboard = await dashboardService.getOwnerDashboard(validatedQuery);

    return res.status(200).json({
      success: true,
      message: "Owner dashboard retrieved successfully",
      data: {
        dashboard,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOwnerDashboard,
};