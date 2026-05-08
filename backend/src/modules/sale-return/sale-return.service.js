const prisma = require("../../config/prisma");
const {
  generateSaleReturnNumber,
} = require("../../utils/generateSaleReturnNumber");

const getAllSaleReturns = async () => {
  return prisma.saleReturn.findMany({
    include: {
      sale: true,
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

const getSaleReturnById = async (id) => {
  const saleReturn = await prisma.saleReturn.findUnique({
    where: {
      id,
    },
    include: {
      sale: {
        include: {
          customer: true,
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

  if (!saleReturn) {
    const error = new Error("Sale return not found");
    error.status = 404;
    throw error;
  }

  return saleReturn;
};

const createSaleReturn = async ({ saleId, note, items, createdById }) => {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: {
        id: saleId,
      },
      include: {
        items: true,
      },
    });

    if (!sale) {
      const error = new Error("Sale not found");
      error.status = 404;
      throw error;
    }

    if (sale.status !== "COMPLETED") {
      const error = new Error("Sale is not completed");
      error.status = 400;
      throw error;
    }

    const productIds = items.map((item) => item.productId);

    const previousReturns = await tx.saleReturnItem.groupBy({
      by: ["productId"],
      where: {
        productId: {
          in: productIds,
        },
        saleReturn: {
          saleId,
          status: "COMPLETED",
        },
      },
      _sum: {
        quantity: true,
      },
    });

    let totalAmount = 0;

    const saleReturnItemsData = items.map((item) => {
      const saleItem = sale.items.find(
        (saleItemData) => saleItemData.productId === item.productId
      );

      if (!saleItem) {
        const error = new Error("Product was not found in this sale");
        error.status = 400;
        throw error;
      }

      const previousReturn = previousReturns.find(
        (previousReturnData) => previousReturnData.productId === item.productId
      );

      const returnedQuantity = previousReturn?._sum.quantity || 0;
      const availableReturnQuantity = saleItem.quantity - returnedQuantity;

      if (item.quantity > availableReturnQuantity) {
        const error = new Error(
          `Return quantity cannot exceed sold quantity. Available return quantity: ${availableReturnQuantity}`
        );
        error.status = 400;
        throw error;
      }

      const subtotal = item.quantity * saleItem.sellingPrice;
      totalAmount += subtotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        sellingPrice: saleItem.sellingPrice,
        subtotal,
        condition: item.condition,
        note: item.note,
      };
    });

    const returnNumber = generateSaleReturnNumber();

    const saleReturn = await tx.saleReturn.create({
      data: {
        returnNumber,
        saleId,
        totalAmount,
        note,
        createdById,
        items: {
          create: saleReturnItemsData,
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

      if (item.condition === "SALEABLE") {
        const stockAfter = stockBefore + item.quantity;

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
            movementNumber: `STK-IN-${returnNumber}-${index + 1}`,
            productId: item.productId,
            type: "IN",
            quantity: item.quantity,
            stockBefore,
            stockAfter,
            note: item.note || `Retur penjualan ${returnNumber}`,
            createdById,
          },
        });
      }

      if (item.condition === "DAMAGED") {
        await tx.stockHistory.create({
          data: {
            movementNumber: `STK-DAMAGED-${returnNumber}-${index + 1}`,
            productId: item.productId,
            type: "DAMAGED",
            quantity: item.quantity,
            stockBefore,
            stockAfter: stockBefore,
            note: item.note || `Retur penjualan rusak ${returnNumber}`,
            createdById,
          },
        });
      }
    }

    return tx.saleReturn.findUnique({
      where: {
        id: saleReturn.id,
      },
      include: {
        sale: {
          include: {
            customer: true,
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
  getAllSaleReturns,
  getSaleReturnById,
  createSaleReturn,
};