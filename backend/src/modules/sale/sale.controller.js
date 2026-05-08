const saleService = require("./sale.service");
const {
  createSaleSchema,
  approveSaleSchema,
  rejectSaleSchema,
} = require("./sale.validation");

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
      createdByRole: req.user.role,
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

const approveSale = async (req, res, next) => {
  try {
    const validatedData = approveSaleSchema.parse(req.body);

    const sale = await saleService.approveSale({
      saleId: req.params.id,
      note: validatedData.note,
      createdById: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Sale approved successfully",
      data: {
        sale,
      },
    });
  } catch (error) {
    next(error);
  }
};

const rejectSale = async (req, res, next) => {
  try {
    const validatedData = rejectSaleSchema.parse(req.body);

    const sale = await saleService.rejectSale({
      saleId: req.params.id,
      note: validatedData.note,
      createdById: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Sale rejected successfully",
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
  approveSale,
  rejectSale,
};