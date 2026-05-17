const prisma = require("../../config/prisma");
const { generateMovementNumber } = require("../../utils/generateMovementNumber");

const getStockHistories = async ({ search, productId, type }) => {
  const keyword = search?.trim();

  const where = {};

  if (productId) {
    where.productId = productId;
  }

  if (type) {
    where.type = type;
  }

  if (keyword) {
    where.OR = [
      {
        movementNumber: {
          contains: keyword,
          mode: "insensitive",
        },
      },
      {
        product: {
          is: {
            supplierCode: {
              contains: keyword,
              mode: "insensitive",
            },
          },
        },
      },
      {
        product: {
          is: {
            name: {
              contains: keyword,
              mode: "insensitive",
            },
          },
        },
      },
      {
        product: {
          is: {
            category: {
              is: {
                name: {
                  contains: keyword,
                  mode: "insensitive",
                },
              },
            },
          },
        },
      },
    ];
  }

  return prisma.stockHistory.findMany({
    where,
    include: {
      product: {
        include: {
          category: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getActiveProductById = async (productId) => {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.status = 404;
    throw error;
  }

  if (product.status !== "ACTIVE") {
    const error = new Error("Product is inactive");
    error.status = 400;
    throw error;
  }

  return product;
};

const stockIn = async ({ productId, quantity, note, createdById }) => {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      const error = new Error("Product not found");
      error.status = 404;
      throw error;
    }

    if (product.status !== "ACTIVE") {
      const error = new Error("Product is inactive");
      error.status = 400;
      throw error;
    }

    const stockBefore = product.stock;
    const stockAfter = stockBefore + quantity;

    const updatedProduct = await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        stock: stockAfter,
      },
    });

    const stockHistory = await tx.stockHistory.create({
      data: {
        movementNumber: generateMovementNumber("IN"),
        productId,
        type: "IN",
        quantity,
        stockBefore,
        stockAfter,
        note,
        createdById,
      },
    });

    return {
      product: updatedProduct,
      stockHistory,
    };
  });
};

const stockOut = async ({ productId, quantity, note, createdById }) => {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      const error = new Error("Product not found");
      error.status = 404;
      throw error;
    }

    if (product.status !== "ACTIVE") {
      const error = new Error("Product is inactive");
      error.status = 400;
      throw error;
    }

    const stockBefore = product.stock;
    const stockAfter = stockBefore - quantity;

    if (stockAfter < 0) {
      const error = new Error("Stock cannot be negative");
      error.status = 400;
      throw error;
    }

    const updatedProduct = await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        stock: stockAfter,
      },
    });

    const stockHistory = await tx.stockHistory.create({
      data: {
        movementNumber: generateMovementNumber("OUT"),
        productId,
        type: "OUT",
        quantity,
        stockBefore,
        stockAfter,
        note,
        createdById,
      },
    });

    return {
      product: updatedProduct,
      stockHistory,
    };
  });
};

const stockAdjustment = async ({ productId, newStock, note, createdById }) => {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      const error = new Error("Product not found");
      error.status = 404;
      throw error;
    }

    if (product.status !== "ACTIVE") {
      const error = new Error("Product is inactive");
      error.status = 400;
      throw error;
    }

    const stockBefore = product.stock;
    const stockAfter = newStock;
    const quantity = stockAfter - stockBefore;

    const updatedProduct = await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        stock: stockAfter,
      },
    });

    const stockHistory = await tx.stockHistory.create({
      data: {
        movementNumber: generateMovementNumber("ADJUSTMENT"),
        productId,
        type: "ADJUSTMENT",
        quantity,
        stockBefore,
        stockAfter,
        note,
        createdById,
      },
    });

    return {
      product: updatedProduct,
      stockHistory,
    };
  });
};

const damagedStock = async ({ productId, quantity, note, createdById }) => {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      const error = new Error("Product not found");
      error.status = 404;
      throw error;
    }

    if (product.status !== "ACTIVE") {
      const error = new Error("Product is inactive");
      error.status = 400;
      throw error;
    }

    const stockBefore = product.stock;
    const stockAfter = stockBefore - quantity;

    if (stockAfter < 0) {
      const error = new Error("Stock cannot be negative");
      error.status = 400;
      throw error;
    }

    const updatedProduct = await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        stock: stockAfter,
      },
    });

    const stockHistory = await tx.stockHistory.create({
      data: {
        movementNumber: generateMovementNumber("DAMAGED"),
        productId,
        type: "DAMAGED",
        quantity,
        stockBefore,
        stockAfter,
        note,
        createdById,
      },
    });

    return {
      product: updatedProduct,
      stockHistory,
    };
  });
};

module.exports = {
  getStockHistories,
  getActiveProductById,
  stockIn,
  stockOut,
  stockAdjustment,
  damagedStock,
};