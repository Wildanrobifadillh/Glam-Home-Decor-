const saleService = require("./sale.service");
const { createSaleSchema } = require("./sale.validation");

const getAllSales = async (req, res, next) => {
  try {
    const sales = await saleService.getAllSales();

    return res.status(200).json({
      success: true,
      message: "Sales retrieved successfully",
      data: {
        sales,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSaleById = async (req, res, next) => {
  try {
    const sale = await saleService.getSaleById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Sale retrieved successfully",
      data: {
        sale,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createSale = async (req, res, next) => {
  try {
    const validatedData = createSaleSchema.parse(req.body);

    const sale = await saleService.createSale({
      ...validatedData,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Sale created successfully",
      data: {
        sale,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSales,
  getSaleById,
  createSale,
};