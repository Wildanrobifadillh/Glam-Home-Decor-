const express = require("express");

const receivableController = require("./receivable.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  receivableController.getAllReceivables
);

router.get(
  "/summary",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  receivableController.getReceivableSummary
);

router.get(
  "/:saleId",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  receivableController.getReceivableBySaleId
);

module.exports = router;