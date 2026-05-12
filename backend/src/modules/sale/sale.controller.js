const saleService = require("./sale.service");
const {
  createSaleSchema,
  approveSaleSchema,
  rejectSaleSchema,
  paySaleSchema,
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

const paySale = async (req, res, next) => {
  try {
    const validatedData = paySaleSchema.parse(req.body);

    const sale = await saleService.paySale({
      saleId: req.params.id,
      amount: validatedData.amount,
      paymentMethod: validatedData.paymentMethod,
      cashBankAccountId: validatedData.cashBankAccountId,
      note: validatedData.note,
      createdById: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Sale payment recorded successfully",
      data: {
        sale,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSaleInvoicePreview = async (req, res, next) => {
  try {
    const invoicePreview = await saleService.getSaleInvoicePreview(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Sale invoice preview retrieved successfully",
      data: {
        invoicePreview,
      },
    });
  } catch (error) {
    next(error);
  }
};

const generateSaleInvoice = async (req, res, next) => {
  try {
    const invoice = await saleService.generateSaleInvoice(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Sale invoice generated successfully",
      data: {
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
};

const generateSaleInvoicePdf = async (req, res, next) => {
  try {
    const { pdfBuffer, fileName } = await saleService.generateSaleInvoicePdf(
      req.params.id
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.status(200).send(pdfBuffer);
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
  paySale,
  getSaleInvoicePreview,
  generateSaleInvoice,
  generateSaleInvoicePdf,
};