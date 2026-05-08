const purchaseReturnService = require("./purchase-return.service");
const {
  createPurchaseReturnSchema,
} = require("./purchase-return.validation");

const getAllPurchaseReturns = async (req, res, next) => {
  try {
    const purchaseReturns = await purchaseReturnService.getAllPurchaseReturns();

    return res.status(200).json({
      success: true,
      message: "Purchase returns retrieved successfully",
      data: {
        purchaseReturns,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPurchaseReturnById = async (req, res, next) => {
  try {
    const purchaseReturn = await purchaseReturnService.getPurchaseReturnById(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Purchase return retrieved successfully",
      data: {
        purchaseReturn,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createPurchaseReturn = async (req, res, next) => {
  try {
    const validatedData = createPurchaseReturnSchema.parse(req.body);

    const purchaseReturn = await purchaseReturnService.createPurchaseReturn({
      ...validatedData,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Purchase return created successfully",
      data: {
        purchaseReturn,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPurchaseReturns,
  getPurchaseReturnById,
  createPurchaseReturn,
};