const reportService = require("./report.service");

const getSalesReport = async (req, res, next) => {
  try {
    const report = await reportService.getSalesReport({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Sales report retrieved successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getPurchaseReport = async (req, res, next) => {
  try {
    const report = await reportService.getPurchaseReport({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Purchase report retrieved successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getReceivableReport = async (req, res, next) => {
  try {
    const report = await reportService.getReceivableReport({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Receivable report retrieved successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getPayableReport = async (req, res, next) => {
  try {
    const report = await reportService.getPayableReport({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Payable report retrieved successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getCashBankReport = async (req, res, next) => {
  try {
    const report = await reportService.getCashBankReport({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Cash/bank report retrieved successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getGeneralLedger = async (req, res, next) => {
  try {
    const report = await reportService.getGeneralLedger({
      accountId: req.params.accountId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json({
      success: true,
      message: "General ledger retrieved successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getProfitLossReport = async (req, res, next) => {
  try {
    const report = await reportService.getProfitLossReport({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Profit loss report retrieved successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getCashFlowReport = async (req, res, next) => {
  try {
    const report = await reportService.getCashFlowReport({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Cash flow report retrieved successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getBalanceSheetReport = async (req, res, next) => {
  try {
    const report = await reportService.getBalanceSheetReport({
      endDate: req.query.endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Balance sheet report retrieved successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const getOwnerSummary = async (req, res, next) => {
  try {
    const report = await reportService.getOwnerSummary({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Owner summary retrieved successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

const exportSalesReportExcel = async (req, res, next) => {
  try {
    const { buffer, fileName } = await reportService.exportSalesReportExcel({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      paymentStatus: req.query.paymentStatus,
      paymentMethod: req.query.paymentMethod,
      status: req.query.status,
      search: req.query.search,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length);

    return res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};

const exportSalesReportPdf = async (req, res, next) => {
  try {
    const { buffer, fileName } = await reportService.exportSalesReportPdf({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      paymentStatus: req.query.paymentStatus,
      paymentMethod: req.query.paymentMethod,
      status: req.query.status,
      search: req.query.search,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length);

    return res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};

const exportPurchaseReportExcel = async (req, res, next) => {
  try {
    const { buffer, fileName } = await reportService.exportPurchaseReportExcel({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      paymentStatus: req.query.paymentStatus,
      paymentMethod: req.query.paymentMethod,
      status: req.query.status,
      search: req.query.search,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length);

    return res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};

const exportPurchaseReportPdf = async (req, res, next) => {
  try {
    const { buffer, fileName } = await reportService.exportPurchaseReportPdf({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      paymentStatus: req.query.paymentStatus,
      paymentMethod: req.query.paymentMethod,
      status: req.query.status,
      search: req.query.search,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length);

    return res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSalesReport,
  getPurchaseReport,
  getReceivableReport,
  getPayableReport,
  getCashBankReport,
  getGeneralLedger,
  getProfitLossReport,
  getCashFlowReport,
  getBalanceSheetReport,
  getOwnerSummary,
  exportSalesReportExcel,
  exportSalesReportPdf,
  exportPurchaseReportExcel,
  exportPurchaseReportPdf,
};