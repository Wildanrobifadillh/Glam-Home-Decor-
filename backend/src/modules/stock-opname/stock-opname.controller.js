const stockOpnameService = require("./stock-opname.service");
const {
  createStockOpnameSchema,
} = require("./stock-opname.validation");

const getAllStockOpnames = async (req, res, next) => {
  try {
    const stockOpnames = await stockOpnameService.getAllStockOpnames();

    return res.status(200).json({
      success: true,
      message: "Stock opnames retrieved successfully",
      data: {
        stockOpnames,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getStockOpnameById = async (req, res, next) => {
  try {
    const stockOpname = await stockOpnameService.getStockOpnameById(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Stock opname retrieved successfully",
      data: {
        stockOpname,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createStockOpname = async (req, res, next) => {
  try {
    const validatedData = createStockOpnameSchema.parse(req.body);

    const stockOpname = await stockOpnameService.createStockOpname({
      ...validatedData,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Stock opname created successfully",
      data: {
        stockOpname,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStockOpnames,
  getStockOpnameById,
  createStockOpname,
};