const inventoryService = require("./inventory.service");
const {
  stockInSchema,
  stockOutSchema,
  stockAdjustmentSchema,
  damagedStockSchema,
} = require("./inventory.validation");

const getStockHistories = async (req, res, next) => {
  try {
    const stockHistories = await inventoryService.getStockHistories({
      productId: req.query.productId,
      type: req.query.type,
    });

    return res.status(200).json({
      success: true,
      message: "Stock histories retrieved successfully",
      data: {
        stockHistories,
      },
    });
  } catch (error) {
    next(error);
  }
};

const stockIn = async (req, res, next) => {
  try {
    const validatedData = stockInSchema.parse(req.body);

    const result = await inventoryService.stockIn({
      ...validatedData,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Stock in recorded successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const stockOut = async (req, res, next) => {
  try {
    const validatedData = stockOutSchema.parse(req.body);

    const result = await inventoryService.stockOut({
      ...validatedData,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Stock out recorded successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const stockAdjustment = async (req, res, next) => {
  try {
    const validatedData = stockAdjustmentSchema.parse(req.body);

    const result = await inventoryService.stockAdjustment({
      ...validatedData,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Stock adjustment recorded successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const damagedStock = async (req, res, next) => {
  try {
    const validatedData = damagedStockSchema.parse(req.body);

    const result = await inventoryService.damagedStock({
      ...validatedData,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Damaged stock recorded successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStockHistories,
  stockIn,
  stockOut,
  stockAdjustment,
  damagedStock,
};