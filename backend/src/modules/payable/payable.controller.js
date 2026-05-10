const payableService = require("./payable.service");

const getAllPayables = async (req, res, next) => {
  try {
    const payables = await payableService.getAllPayables({
      paymentStatus: req.query.paymentStatus,
      supplierId: req.query.supplierId,
      search: req.query.search,
    });

    return res.status(200).json({
      success: true,
      message: "Payables retrieved successfully",
      data: {
        payables,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPayableSummary = async (req, res, next) => {
  try {
    const summary = await payableService.getPayableSummary();

    return res.status(200).json({
      success: true,
      message: "Payable summary retrieved successfully",
      data: {
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPayableByPurchaseId = async (req, res, next) => {
  try {
    const payable = await payableService.getPayableByPurchaseId(
      req.params.purchaseId
    );

    return res.status(200).json({
      success: true,
      message: "Payable retrieved successfully",
      data: {
        payable,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPayables,
  getPayableSummary,
  getPayableByPurchaseId,
};