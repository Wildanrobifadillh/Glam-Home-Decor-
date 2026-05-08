const purchaseService = require("./purchase.service");
const { createPurchaseSchema } = require("./purchase.validation");

const getAllPurchases = async (req, res, next) => {
  try {
    const purchases = await purchaseService.getAllPurchases();

    return res.status(200).json({
      success: true,
      message: "Purchases retrieved successfully",
      data: {
        purchases,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await purchaseService.getPurchaseById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Purchase retrieved successfully",
      data: {
        purchase,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createPurchase = async (req, res, next) => {
  try {
    const validatedData = createPurchaseSchema.parse(req.body);

    const purchase = await purchaseService.createPurchase({
      ...validatedData,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Purchase created successfully",
      data: {
        purchase,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPurchases,
  getPurchaseById,
  createPurchase,
};