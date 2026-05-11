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

module.exports = router;