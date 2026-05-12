const express = require("express");

const saleController = require("./sale.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get("/", authenticate, saleController.getAllSales);

router.get(
  "/:id/invoice-preview",
  authenticate,
  saleController.getSaleInvoicePreview
);

router.get("/:id", authenticate, saleController.getSaleById);

router.post(
  "/:id/generate-invoice",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  saleController.generateSaleInvoice
);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  saleController.createSale
);

router.post(
  "/:id/payments",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  saleController.paySale
);

router.patch(
  "/:id/approve",
  authenticate,
  authorizeRoles("OWNER"),
  saleController.approveSale
);

router.patch(
  "/:id/reject",
  authenticate,
  authorizeRoles("OWNER"),
  saleController.rejectSale
);

module.exports = router;