const express = require("express");

const stockOpnameController = require("./stock-opname.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get("/", authenticate, stockOpnameController.getAllStockOpnames);
router.get("/:id", authenticate, stockOpnameController.getStockOpnameById);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF", "STAFF_GUDANG"),
  stockOpnameController.createStockOpname
);

module.exports = router;