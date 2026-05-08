const supplierService = require("./supplier.service");
const {
  createSupplierSchema,
  updateSupplierSchema,
} = require("./supplier.validation");

const getAllSuppliers = async (req, res, next) => {
  try {
    const suppliers = await supplierService.getAllSuppliers();

    return res.status(200).json({
      success: true,
      message: "Suppliers retrieved successfully",
      data: {
        suppliers,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await supplierService.getSupplierById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Supplier retrieved successfully",
      data: {
        supplier,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createSupplier = async (req, res, next) => {
  try {
    const validatedData = createSupplierSchema.parse(req.body);

    const supplier = await supplierService.createSupplier(validatedData);

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: {
        supplier,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const validatedData = updateSupplierSchema.parse(req.body);

    const supplier = await supplierService.updateSupplier(
      req.params.id,
      validatedData
    );

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      data: {
        supplier,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deactivateSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.deactivateSupplier(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Supplier deactivated successfully",
      data: {
        supplier,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deactivateSupplier,
};