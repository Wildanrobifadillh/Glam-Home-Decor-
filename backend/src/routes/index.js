const express = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const categoryRoutes = require("../modules/category/category.routes");
const productRoutes = require("../modules/product/product.routes");
const supplierRoutes = require("../modules/supplier/supplier.routes");
const inventoryRoutes = require("../modules/inventory/inventory.routes");
const purchaseRoutes = require("../modules/purchase/purchase.routes");
const saleRoutes = require("../modules/sale/sale.routes");
const customerRoutes = require("../modules/customer/customer.routes");
const stockOpnameRoutes = require("../modules/stock-opname/stock-opname.routes");
const saleReturnRoutes = require("../modules/sale-return/sale-return.routes");
const purchaseReturnRoutes = require("../modules/purchase-return/purchase-return.routes");
const employeeRoutes = require("../modules/employee/employee.routes");
const accountRoutes = require("../modules/account/account.routes");
const cashBankAccountRoutes = require("../modules/cash-bank-account/cash-bank-account.routes");
const journalEntryRoutes = require("../modules/journal-entry/journal-entry.routes");

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
router.use("/sales", saleRoutes);
router.use("/customers", customerRoutes);
router.use("/stock-opnames", stockOpnameRoutes);
router.use("/sale-returns", saleReturnRoutes);
router.use("/purchase-returns", purchaseReturnRoutes);
router.use("/employees", employeeRoutes);
router.use("/accounts", accountRoutes);
router.use("/cash-bank-accounts", cashBankAccountRoutes);
router.use("/journal-entries", journalEntryRoutes);

module.exports = router;