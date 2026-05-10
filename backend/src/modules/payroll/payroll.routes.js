const express = require("express");

const payrollController = require("./payroll.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  payrollController.getAllPayrolls
);

router.get(
  "/summary",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  payrollController.getPayrollSummary
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  payrollController.getPayrollById
);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  payrollController.createPayroll
);

module.exports = router;