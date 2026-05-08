const express = require("express");

const inventoryController = require("./inventory.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get(
  "/stock-histories",
  authenticate,
  inventoryController.getStockHistories
);

router.post(
  "/stock-in",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF", "STAFF_GUDANG"),
  inventoryController.stockIn
);

router.post(
  "/stock-out",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF", "STAFF_GUDANG"),
  inventoryController.stockOut
);

router.post(
  "/stock-adjustment",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF", "STAFF_GUDANG"),
  inventoryController.stockAdjustment
);

router.post(
  "/damaged-stock",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF", "STAFF_GUDANG"),
  inventoryController.damagedStock
);

module.exports = router;