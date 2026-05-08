const express = require("express");

const saleReturnController = require("./sale-return.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get("/", authenticate, saleReturnController.getAllSaleReturns);
router.get("/:id", authenticate, saleReturnController.getSaleReturnById);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  saleReturnController.createSaleReturn
);

module.exports = router;