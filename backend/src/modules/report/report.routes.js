const express = require("express");

const reportController = require("./report.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get(
  "/sales/export-excel",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  reportController.exportSalesReportExcel
);

router.get(
  "/sales/export-pdf",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  reportController.exportSalesReportPdf
);

router.get(
  "/sales",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  reportController.getSalesReport
);

router.get(
  "/purchases/export-excel",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  reportController.exportPurchaseReportExcel
);

router.get(
  "/purchases/export-pdf",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  reportController.exportPurchaseReportPdf
);

router.get(
  "/purchases",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  reportController.getPurchaseReport
);

router.get(
  "/receivables",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  reportController.getReceivableReport
);

router.get(
  "/payables",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  reportController.getPayableReport
);

router.get(
  "/cash-bank",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  reportController.getCashBankReport
);

router.get(
  "/general-ledger/:accountId",
  authenticate,
  authorizeRoles("OWNER"),
  reportController.getGeneralLedger
);

router.get(
  "/profit-loss",
  authenticate,
  authorizeRoles("OWNER"),
  reportController.getProfitLossReport
);

router.get(
  "/cash-flow",
  authenticate,
  authorizeRoles("OWNER"),
  reportController.getCashFlowReport
);

router.get(
  "/balance-sheet",
  authenticate,
  authorizeRoles("OWNER"),
  reportController.getBalanceSheetReport
);

router.get(
  "/owner-summary",
  authenticate,
  authorizeRoles("OWNER"),
  reportController.getOwnerSummary
);

module.exports = router;