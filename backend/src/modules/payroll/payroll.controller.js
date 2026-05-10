const payrollService = require("./payroll.service");
const { createPayrollSchema } = require("./payroll.validation");

const getAllPayrolls = async (req, res, next) => {
  try {
    const payrolls = await payrollService.getAllPayrolls({
      employeeId: req.query.employeeId,
      periodMonth: req.query.periodMonth,
      periodYear: req.query.periodYear,
      paymentMethod: req.query.paymentMethod,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
    });

    return res.status(200).json({
      success: true,
      message: "Payrolls retrieved successfully",
      data: {
        payrolls,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPayrollSummary = async (req, res, next) => {
  try {
    const summary = await payrollService.getPayrollSummary({
      periodMonth: req.query.periodMonth,
      periodYear: req.query.periodYear,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Payroll summary retrieved successfully",
      data: {
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPayrollById = async (req, res, next) => {
  try {
    const payroll = await payrollService.getPayrollById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Payroll retrieved successfully",
      data: {
        payroll,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createPayroll = async (req, res, next) => {
  try {
    const validatedData = createPayrollSchema.parse(req.body);

    const payroll = await payrollService.createPayroll({
      ...validatedData,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Payroll created successfully",
      data: {
        payroll,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPayrolls,
  getPayrollSummary,
  getPayrollById,
  createPayroll,
};