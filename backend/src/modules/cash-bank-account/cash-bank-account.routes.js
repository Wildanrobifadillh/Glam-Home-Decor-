const express = require("express");

const cashBankAccountController = require("./cash-bank-account.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get("/", authenticate, cashBankAccountController.getAllCashBankAccounts);
router.get("/:id", authenticate, cashBankAccountController.getCashBankAccountById);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER"),
  cashBankAccountController.createCashBankAccount
);

router.patch(
  "/:id",
  authenticate,
  authorizeRoles("OWNER"),
  cashBankAccountController.updateCashBankAccount
);

router.patch(
  "/:id/deactivate",
  authenticate,
  authorizeRoles("OWNER"),
  cashBankAccountController.deactivateCashBankAccount
);

module.exports = router;