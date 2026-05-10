const express = require("express");

const payableController = require("./payable.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  payableController.getAllPayables
);

router.get(
  "/summary",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  payableController.getPayableSummary
);

router.get(
  "/:purchaseId",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  payableController.getPayableByPurchaseId
);

module.exports = router;