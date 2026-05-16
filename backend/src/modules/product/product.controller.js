const productService = require("./product.service");
const {
  createProductSchema,
  updateProductSchema,
} = require("./product.validation");

const getAllProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProducts({
      search: req.query.search,
      categoryId: req.query.categoryId,
      status: req.query.status,
    });

    return res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: {
        products,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const validatedData = createProductSchema.parse(req.body);

    const product = await productService.createProduct(validatedData);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const validatedData = updateProductSchema.parse(req.body);

    const product = await productService.updateProduct(
      req.params.id,
      validatedData
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deactivateProduct = async (req, res, next) => {
  try {
    const product = await productService.deactivateProduct(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Product deactivated successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

const activateProduct = async (req, res, next) => {
  try {
    const product = await productService.activateProduct(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Product activated successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
  activateProduct,
};