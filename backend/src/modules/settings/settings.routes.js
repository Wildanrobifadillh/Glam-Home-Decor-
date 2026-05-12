const express = require("express");

const settingsController = require("./settings.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get(
  "/store-profile",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  settingsController.getStoreProfile
);

router.put(
  "/store-profile",
  authenticate,
  authorizeRoles("OWNER"),
  settingsController.updateStoreProfile
);

router.get(
  "/store-bank-accounts",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  settingsController.getStoreBankAccounts
);

router.post(
  "/store-bank-accounts",
  authenticate,
  authorizeRoles("OWNER"),
  settingsController.createStoreBankAccount
);

router.get(
  "/store-bank-accounts/:id",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  settingsController.getStoreBankAccountById
);

router.put(
  "/store-bank-accounts/:id",
  authenticate,
  authorizeRoles("OWNER"),
  settingsController.updateStoreBankAccount
);

router.patch(
  "/store-bank-accounts/:id/default",
  authenticate,
  authorizeRoles("OWNER"),
  settingsController.setDefaultStoreBankAccount
);

router.patch(
  "/store-bank-accounts/:id/status",
  authenticate,
  authorizeRoles("OWNER"),
  settingsController.updateStoreBankAccountStatus
);

router.get(
  "/users",
  authenticate,
  authorizeRoles("OWNER"),
  settingsController.getSettingsUsers
);

router.post(
  "/users",
  authenticate,
  authorizeRoles("OWNER"),
  settingsController.createSettingsUser
);

router.get(
  "/users/:id",
  authenticate,
  authorizeRoles("OWNER"),
  settingsController.getSettingsUserById
);

router.put(
  "/users/:id",
  authenticate,
  authorizeRoles("OWNER"),
  settingsController.updateSettingsUser
);

router.patch(
  "/users/:id/role",
  authenticate,
  authorizeRoles("OWNER"),
  settingsController.updateSettingsUserRole
);

router.patch(
  "/users/:id/status",
  authenticate,
  authorizeRoles("OWNER"),
  settingsController.updateSettingsUserStatus
);

router.patch(
  "/users/:id/reset-password",
  authenticate,
  authorizeRoles("OWNER"),
  settingsController.resetSettingsUserPassword
);

module.exports = router;