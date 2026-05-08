const express = require("express");

const purchaseReturnController = require("./purchase-return.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get("/", authenticate, purchaseReturnController.getAllPurchaseReturns);
router.get("/:id", authenticate, purchaseReturnController.getPurchaseReturnById);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  purchaseReturnController.createPurchaseReturn
);

module.exports = router;