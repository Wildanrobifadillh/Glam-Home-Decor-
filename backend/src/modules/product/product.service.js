const prisma = require("../../config/prisma");
const { normalizeSearchCode } = require("../../utils/normalizeSearchCode");

const getAllProducts = async ({ search, categoryId, status }) => {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (search) {
    const normalizedSearch = normalizeSearchCode(search);

    where.OR = [
      {
        supplierCode: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        searchCode: {
          contains: normalizedSearch,
        },
      },
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  return prisma.product.findMany({
    where,
    include: {
      category: true,
    },
    orderBy: {
      name: "asc",
    },
  });
};

const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: {
      id,
    },
    include: {
      category: true,
    },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.status = 404;
    throw error;
  }

  return product;
};

const createProduct = async (data) => {
  const category = await prisma.category.findUnique({
    where: {
      id: data.categoryId,
    },
  });

  if (!category) {
    const error = new Error("Category not found");
    error.status = 404;
    throw error;
  }

  if (category.status !== "ACTIVE") {
    const error = new Error("Category is inactive");
    error.status = 400;
    throw error;
  }

  const searchCode = normalizeSearchCode(data.supplierCode);

  const existingSupplierCode = await prisma.product.findUnique({
    where: {
      supplierCode: data.supplierCode,
    },
  });

  if (existingSupplierCode) {
    const error = new Error("Supplier code already exists");
    error.status = 409;
    throw error;
  }

  const existingSearchCode = await prisma.product.findUnique({
    where: {
      searchCode,
    },
  });

  if (existingSearchCode) {
    const error = new Error("Search code already exists");
    error.status = 409;
    throw error;
  }

  return prisma.product.create({
    data: {
      supplierCode: data.supplierCode,
      searchCode,
      name: data.name,
      categoryId: data.categoryId,
      unit: data.unit,
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      minStock: data.minStock,
      stock: data.stock,
      imageUrl: data.imageUrl ?? null,
    },
    include: {
      category: true,
    },
  });
};

const updateProduct = async (id, data) => {
  await getProductById(id);

  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: {
        id: data.categoryId,
      },
    });

    if (!category) {
      const error = new Error("Category not found");
      error.status = 404;
      throw error;
    }

    if (category.status !== "ACTIVE") {
      const error = new Error("Category is inactive");
      error.status = 400;
      throw error;
    }
  }

  const updateData = {
    ...data,
  };

  if (data.supplierCode) {
    const searchCode = normalizeSearchCode(data.supplierCode);

    const existingSupplierCode = await prisma.product.findUnique({
      where: {
        supplierCode: data.supplierCode,
      },
    });

    if (existingSupplierCode && existingSupplierCode.id !== id) {
      const error = new Error("Kode barang sudah digunakan");
      error.status = 409;
      throw error;
    }

    const existingSearchCode = await prisma.product.findUnique({
      where: {
        searchCode,
      },
    });

    if (existingSearchCode && existingSearchCode.id !== id) {
      const error = new Error("Kode pencarian barang sudah digunakan");
      error.status = 409;
      throw error;
    }

    updateData.searchCode = searchCode;
  }

  return prisma.product.update({
    where: {
      id,
    },
    data: updateData,
    include: {
      category: true,
    },
  });
};

const deactivateProduct = async (id) => {
  await getProductById(id);

  return prisma.product.update({
    where: {
      id,
    },
    data: {
      status: "INACTIVE",
    },
    include: {
      category: true,
    },
  });
};

const activateProduct = async (id) => {
  await getProductById(id);

  return prisma.product.update({
    where: {
      id,
    },
    data: {
      status: "ACTIVE",
    },
    include: {
      category: true,
    },
  });
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
  activateProduct,
};