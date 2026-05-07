const express = require("express");

const categoryController = require("./category.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get("/", authenticate, categoryController.getAllCategories);
router.get("/:id", authenticate, categoryController.getCategoryById);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  categoryController.createCategory
);

router.patch(
  "/:id",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  categoryController.updateCategory
);

router.patch(
  "/:id/deactivate",
  authenticate,
  authorizeRoles("OWNER", "ADMIN_STAFF"),
  categoryController.deactivateCategory
);

module.exports = router;