const express = require("express");

const accountController = require("./account.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get("/", authenticate, accountController.getAllAccounts);
router.get("/:id", authenticate, accountController.getAccountById);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER"),
  accountController.createAccount
);

router.patch(
  "/:id",
  authenticate,
  authorizeRoles("OWNER"),
  accountController.updateAccount
);

router.patch(
  "/:id/deactivate",
  authenticate,
  authorizeRoles("OWNER"),
  accountController.deactivateAccount
);

module.exports = router;