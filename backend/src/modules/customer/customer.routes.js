const express = require("express");

const customerController = require("./customer.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get("/", authenticate, customerController.getAllCustomers);
router.get("/:id", authenticate, customerController.getCustomerById);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  customerController.createCustomer
);

router.patch(
  "/:id",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  customerController.updateCustomer
);

router.patch(
  "/:id/deactivate",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  customerController.deactivateCustomer
);

module.exports = router;