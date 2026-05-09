const express = require("express");

const purchaseController = require("./purchase.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get("/", authenticate, purchaseController.getAllPurchases);
router.get("/:id", authenticate, purchaseController.getPurchaseById);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  purchaseController.createPurchase
);

router.post(
  "/:id/payments",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  purchaseController.payPurchase
);

module.exports = router;