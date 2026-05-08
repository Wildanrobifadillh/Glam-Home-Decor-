const prisma = require("../../config/prisma");
const { generatePurchaseNumber } = require("../../utils/generatePurchaseNumber");
const { generateMovementNumber } = require("../../utils/generateMovementNumber");

const getAllPurchases = async () => {
  return prisma.purchase.findMany({
    include: {
      supplier: true,
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

const getPurchaseById = async (id) => {
  const purchase = await prisma.purchase.findUnique({
    where: {
      id,
    },
    include: {
      supplier: true,
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

  if (!purchase) {
    const error = new Error("Purchase not found");
    error.status = 404;
    throw error;
  }

  return purchase;
};

const createPurchase = async ({ supplierId, note, items, createdById }) => {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findUnique({
      where: {
        id: supplierId,
      },
    });

    if (!supplier) {
      const error = new Error("Supplier not found");
      error.status = 404;
      throw error;
    }

    if (supplier.status !== "ACTIVE") {
      const error = new Error("Supplier is inactive");
      error.status = 400;
      throw error;
    }

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

    let totalAmount = 0;

    const purchaseItemsData = items.map((item) => {
      const subtotal = item.quantity * item.purchasePrice;
      totalAmount += subtotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        subtotal,
      };
    });

    const purchaseNumber = generatePurchaseNumber();

    const purchase = await tx.purchase.create({
      data: {
        purchaseNumber,
        supplierId,
        totalAmount,
        note,
        createdById,
        items: {
          create: purchaseItemsData,
        },
      },
      include: {
        supplier: true,
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
    });

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];

      const product = await tx.product.findUnique({
        where: {
          id: item.productId,
        },
      });

      const stockBefore = product.stock;
      const stockAfter = stockBefore + item.quantity;

      await tx.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stock: stockAfter,
          purchasePrice: item.purchasePrice,
        },
      });

      await tx.stockHistory.create({
        data: {
          movementNumber: `STK-IN-${purchaseNumber}-${index + 1}`,
          productId: item.productId,
          type: "IN",
          quantity: item.quantity,
          stockBefore,
          stockAfter,
          note: `Pembelian ${purchaseNumber}`,
          createdById,
        },
      });
    }

    return purchase;
  });
};

module.exports = {
  getAllPurchases,
  getPurchaseById,
  createPurchase,
};