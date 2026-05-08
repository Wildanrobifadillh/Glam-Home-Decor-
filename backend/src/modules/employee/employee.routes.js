const express = require("express");

const employeeController = require("./employee.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get("/", authenticate, employeeController.getAllEmployees);
router.get("/:id", authenticate, employeeController.getEmployeeById);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  employeeController.createEmployee
);

router.patch(
  "/:id",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  employeeController.updateEmployee
);

router.patch(
  "/:id/deactivate",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  employeeController.deactivateEmployee
);

module.exports = router;