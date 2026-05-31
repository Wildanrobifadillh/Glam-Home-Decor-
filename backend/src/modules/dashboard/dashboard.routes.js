const express = require("express");

const dashboardController = require("./dashboard.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get(
  "/owner",
  authenticate,
  authorizeRoles("OWNER"),
  dashboardController.getOwnerDashboard
);

module.exports = router;