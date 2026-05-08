const saleReturnService = require("./sale-return.service");
const { createSaleReturnSchema } = require("./sale-return.validation");

const getAllSaleReturns = async (req, res, next) => {
  try {
    const saleReturns = await saleReturnService.getAllSaleReturns();

    return res.status(200).json({
      success: true,
      message: "Sale returns retrieved successfully",
      data: {
        saleReturns,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSaleReturnById = async (req, res, next) => {
  try {
    const saleReturn = await saleReturnService.getSaleReturnById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Sale return retrieved successfully",
      data: {
        saleReturn,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createSaleReturn = async (req, res, next) => {
  try {
    const validatedData = createSaleReturnSchema.parse(req.body);

    const saleReturn = await saleReturnService.createSaleReturn({
      ...validatedData,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Sale return created successfully",
      data: {
        saleReturn,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSaleReturns,
  getSaleReturnById,
  createSaleReturn,
};