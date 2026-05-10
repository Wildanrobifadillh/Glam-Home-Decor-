const receivableService = require("./receivable.service");

const getAllReceivables = async (req, res, next) => {
  try {
    const receivables = await receivableService.getAllReceivables({
      paymentStatus: req.query.paymentStatus,
      customerId: req.query.customerId,
      search: req.query.search,
    });

    return res.status(200).json({
      success: true,
      message: "Receivables retrieved successfully",
      data: {
        receivables,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getReceivableSummary = async (req, res, next) => {
  try {
    const summary = await receivableService.getReceivableSummary();

    return res.status(200).json({
      success: true,
      message: "Receivable summary retrieved successfully",
      data: {
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getReceivableBySaleId = async (req, res, next) => {
  try {
    const receivable = await receivableService.getReceivableBySaleId(
      req.params.saleId
    );

    return res.status(200).json({
      success: true,
      message: "Receivable retrieved successfully",
      data: {
        receivable,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllReceivables,
  getReceivableSummary,
  getReceivableBySaleId,
};