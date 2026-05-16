const express = require("express");

const supplierController = require("./supplier.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get("/", authenticate, supplierController.getAllSuppliers);
router.get("/:id", authenticate, supplierController.getSupplierById);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  supplierController.createSupplier
);

router.patch(
  "/:id",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  supplierController.updateSupplier
);

router.patch(
  "/:id/deactivate",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  supplierController.deactivateSupplier
);

router.patch(
  "/:id/activate",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  supplierController.activateSupplier
);

module.exports = router;