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
      customer: true,
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
      customer: true,
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
  customerId,
  customerName,
  customerPhone,
  paidAmount,
  paymentMethod,
  note,
  items,
  createdById,
}) => {
  return prisma.$transaction(async (tx) => {
    let customer = null;

    if (customerId) {
      customer = await tx.customer.findUnique({
        where: {
          id: customerId,
        },
      });

      if (!customer) {
        const error = new Error("Customer not found");
        error.status = 404;
        throw error;
      }

      if (customer.status !== "ACTIVE") {
        const error = new Error("Customer is inactive");
        error.status = 400;
        throw error;
      }
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

    const saleItemsData = items.map((item) => {
      const product = products.find(
        (productItem) => productItem.id === item.productId
      );

      const costPrice = product.purchasePrice;
      const subtotal = item.quantity * item.sellingPrice;
      const profit = (item.sellingPrice - costPrice) * item.quantity;

      totalAmount += subtotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        costPrice,
        profit,
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
        customerId,
        customerName: customerId ? customer.name : customerName,
        customerPhone: customerId ? customer.phone : customerPhone,
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentStatus,
        paymentMethod,
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
        customer: true,
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