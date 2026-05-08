const prisma = require("../../config/prisma");
const { generateSaleNumber } = require("../../utils/generateSaleNumber");

const getPaymentStatus = (totalAmount, paidAmount) => {
  if (paidAmount === 0) {
    return "UNPAID";
  }

  if (paidAmount < totalAmount) {
    return "PARTIAL";
  }

  return "PAID";
};

const getAllSales = async () => {
  return prisma.sale.findMany({
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

const getSaleById = async (id) => {
  const sale = await prisma.sale.findUnique({
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

  if (!sale) {
    const error = new Error("Sale not found");
    error.status = 404;
    throw error;
  }

  return sale;
};

const createSale = async ({
  customerName,
  customerPhone,
  paidAmount,
  note,
  items,
  createdById,
}) => {
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

    let totalAmount = 0;

    const saleItemsData = items.map((item) => {
      const subtotal = item.quantity * item.sellingPrice;
      totalAmount += subtotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        subtotal,
      };
    });

    if (paidAmount > totalAmount) {
      const error = new Error("Paid amount cannot exceed total amount");
      error.status = 400;
      throw error;
    }

    const remainingAmount = totalAmount - paidAmount;
    const paymentStatus = getPaymentStatus(totalAmount, paidAmount);
    const saleNumber = generateSaleNumber();

    const sale = await tx.sale.create({
      data: {
        saleNumber,
        customerName,
        customerPhone,
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentStatus,
        note,
        createdById,
        items: {
          create: saleItemsData,
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
          movementNumber: `STK-OUT-${saleNumber}-${index + 1}`,
          productId: item.productId,
          type: "OUT",
          quantity: item.quantity,
          stockBefore,
          stockAfter,
          note: `Penjualan ${saleNumber}`,
          createdById,
        },
      });
    }

    return tx.sale.findUnique({
      where: {
        id: sale.id,
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
  getAllSales,
  getSaleById,
  createSale,
};