const categoryService = require("./category.service");
const {
  createCategorySchema,
  updateCategorySchema,
} = require("./category.validation");

const getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories();

    return res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: {
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Category retrieved successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const validatedData = createCategorySchema.parse(req.body);

    const category = await categoryService.createCategory(validatedData);

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const validatedData = updateCategorySchema.parse(req.body);

    const category = await categoryService.updateCategory(
      req.params.id,
      validatedData
    );

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deactivateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.deactivateCategory(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Category deactivated successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deactivateCategory,
};