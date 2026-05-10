const express = require("express");

const expenseController = require("./expense.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  expenseController.getAllExpenses
);

router.get(
  "/summary",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  expenseController.getExpenseSummary
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  expenseController.getExpenseById
);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  expenseController.createExpense
);

module.exports = router;