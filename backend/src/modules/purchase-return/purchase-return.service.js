const prisma = require("../../config/prisma");
const {
  generatePurchaseReturnNumber,
} = require("../../utils/generatePurchaseReturnNumber");

const getAllPurchaseReturns = async () => {
  return prisma.purchaseReturn.findMany({
    include: {
      purchase: {
        include: {
          supplier: true,
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
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getPurchaseReturnById = async (id) => {
  const purchaseReturn = await prisma.purchaseReturn.findUnique({
    where: {
      id,
    },
    include: {
      purchase: {
        include: {
          supplier: true,
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

  if (!purchaseReturn) {
    const error = new Error("Purchase return not found");
    error.status = 404;
    throw error;
  }

  return purchaseReturn;
};

const createPurchaseReturn = async ({ purchaseId, note, items, createdById }) => {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: {
        id: purchaseId,
      },
      include: {
        items: true,
      },
    });

    if (!purchase) {
      const error = new Error("Purchase not found");
      error.status = 404;
      throw error;
    }

    if (purchase.status !== "COMPLETED") {
      const error = new Error("Purchase is not completed");
      error.status = 400;
      throw error;
    }

    const productIds = items.map((item) => item.productId);

    const previousReturns = await tx.purchaseReturnItem.groupBy({
      by: ["productId"],
      where: {
        productId: {
          in: productIds,
        },
        purchaseReturn: {
          purchaseId,
          status: "COMPLETED",
        },
      },
      _sum: {
        quantity: true,
      },
    });

    let totalAmount = 0;

    const purchaseReturnItemsData = items.map((item) => {
      const purchaseItem = purchase.items.find(
        (purchaseItemData) => purchaseItemData.productId === item.productId
      );

      if (!purchaseItem) {
        const error = new Error("Product was not found in this purchase");
        error.status = 400;
        throw error;
      }

      const previousReturn = previousReturns.find(
        (previousReturnData) => previousReturnData.productId === item.productId
      );

      const returnedQuantity = previousReturn?._sum.quantity || 0;
      const availableReturnQuantity = purchaseItem.quantity - returnedQuantity;

      if (item.quantity > availableReturnQuantity) {
        const error = new Error(
          `Return quantity cannot exceed purchased quantity. Available return quantity: ${availableReturnQuantity}`
        );
        error.status = 400;
        throw error;
      }

      const subtotal = item.quantity * purchaseItem.purchasePrice;
      totalAmount += subtotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        purchasePrice: purchaseItem.purchasePrice,
        subtotal,
        note: item.note,
      };
    });

    const returnNumber = generatePurchaseReturnNumber();

    const purchaseReturn = await tx.purchaseReturn.create({
      data: {
        returnNumber,
        purchaseId,
        totalAmount,
        note,
        createdById,
        items: {
          create: purchaseReturnItemsData,
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
      const stockAfter = stockBefore - item.quantity;

      if (stockAfter < 0) {
        const error = new Error(`Stock is not enough for ${product.name}`);
        error.status = 400;
        throw error;
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
          movementNumber: `STK-OUT-${returnNumber}-${index + 1}`,
          productId: item.productId,
          type: "OUT",
          quantity: item.quantity,
          stockBefore,
          stockAfter,
          note: item.note || `Retur pembelian ${returnNumber}`,
          createdById,
        },
      });
    }

    return tx.purchaseReturn.findUnique({
      where: {
        id: purchaseReturn.id,
      },
      include: {
        purchase: {
          include: {
            supplier: true,
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
  getAllPurchaseReturns,
  getPurchaseReturnById,
  createPurchaseReturn,
};