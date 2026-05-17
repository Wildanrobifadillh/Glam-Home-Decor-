const prisma = require("../../config/prisma");
const {
  generateStockOpnameNumber,
} = require("../../utils/generateStockOpnameNumber");

const getAllStockOpnames = async () => {
  return prisma.stockOpname.findMany({
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getStockOpnameById = async (id) => {
  const stockOpname = await prisma.stockOpname.findUnique({
    where: {
      id,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      },
      items: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  if (!stockOpname) {
    const error = new Error("Stock opname not found");
    error.status = 404;
    throw error;
  }

  return stockOpname;
};

const createStockOpname = async ({ note, items, createdById }) => {
  return prisma.$transaction(async (tx) => {
    const productIds = items.map((item) => item.productId);
    const uniqueProductIds = [...new Set(productIds)];

    const products = await tx.product.findMany({
      where: {
        id: {
          in: uniqueProductIds,
        },
      },
    });

    if (products.length !== uniqueProductIds.length) {
      const error = new Error("One or more products were not found");
      error.status = 404;
      throw error;
    }

    for (const product of products) {
      if (product.status !== "ACTIVE") {
        const error = new Error(`Product ${product.name} is inactive`);
        error.status = 400;
        throw error;
      }
    }

    const opnameNumber = generateStockOpnameNumber();

    const stockOpnameItemsData = items.map((item) => {
      const product = products.find(
        (productItem) => productItem.id === item.productId
      );

      const systemStock = product.stock;
      const physicalStock = item.physicalStock;
      const difference = physicalStock - systemStock;

      return {
        productId: item.productId,
        systemStock,
        physicalStock,
        difference,
        note: item.note,
      };
    });

    const stockOpname = await tx.stockOpname.create({
      data: {
        opnameNumber,
        note,
        createdById,
        items: {
          create: stockOpnameItemsData,
        },
      },
    });

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];

      const product = await tx.product.findUnique({
        where: {
          id: item.productId,
        },
      });

      const stockBefore = product.stock;
      const stockAfter = item.physicalStock;
      const difference = stockAfter - stockBefore;

      if (difference === 0) {
        continue;
      }

      await tx.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stock: stockAfter,
        },
      });

      await tx.stockHistory.create({
        data: {
          movementNumber: `STK-ADJ-${opnameNumber}-${index + 1}`,
          productId: item.productId,
          type: "ADJUSTMENT",
          quantity: difference,
          stockBefore,
          stockAfter,
          note: item.note || `Stock opname ${opnameNumber}`,
          createdById,
        },
      });
    }

    return tx.stockOpname.findUnique({
      where: {
        id: stockOpname.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });
  });
};

module.exports = {
  getAllStockOpnames,
  getStockOpnameById,
  createStockOpname,
};