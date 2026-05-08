const express = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const categoryRoutes = require("../modules/category/category.routes");
const productRoutes = require("../modules/product/product.routes");
const supplierRoutes = require("../modules/supplier/supplier.routes");
const inventoryRoutes = require("../modules/inventory/inventory.routes");
const purchaseRoutes = require("../modules/purchase/purchase.routes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/purchases", purchaseRoutes);

module.exports = router;