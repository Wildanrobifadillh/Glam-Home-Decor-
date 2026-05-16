const express = require("express");

const productController = require("./product.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get("/", authenticate, productController.getAllProducts);
router.get("/:id", authenticate, productController.getProductById);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  productController.createProduct
);

router.patch(
  "/:id",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  productController.updateProduct
);

router.patch(
  "/:id/deactivate",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  productController.deactivateProduct
);

router.patch(
  "/:id/activate",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  productController.activateProduct
);

module.exports = router;