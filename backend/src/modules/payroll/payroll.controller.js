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

const getPayrollSlipPreview = async (req, res, next) => {
  try {
    const slipPreview = await payrollService.getPayrollSlipPreview(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Payroll slip preview retrieved successfully",
      data: {
        slipPreview,
      },
    });
  } catch (error) {
    next(error);
  }
};

const generatePayrollSlipPdf = async (req, res, next) => {
  try {
    const { pdfBuffer, fileName } = await payrollService.generatePayrollSlipPdf(
      req.params.id
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPayrolls,
  getPayrollSummary,
  getPayrollById,
  createPayroll,
  getPayrollSlipPreview,
  generatePayrollSlipPdf,
};