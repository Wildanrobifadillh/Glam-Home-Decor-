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

const createSaleStockHistories = async ({ tx, sale, items, createdById }) => {
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
        movementNumber: `STK-OUT-${sale.saleNumber}-${index + 1}`,
        productId: item.productId,
        type: "OUT",
        quantity: item.quantity,
        stockBefore,
        stockAfter,
        note: `Penjualan ${sale.saleNumber}`,
        createdById,
      },
    });
  }
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
      approvalHistories: {
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
      },
      receivablePayments: {
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
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
      approvalHistories: {
        include: {
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
      },
      receivablePayments: {
        include: {
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
  createdByRole,
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

    const isReceivable = remainingAmount > 0;
    const needsOwnerApproval =
      isReceivable && createdByRole !== "OWNER";

    const saleStatus = needsOwnerApproval
      ? "PENDING_APPROVAL"
      : "COMPLETED";

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
        status: saleStatus,
        note,
        createdById,
        items: {
          create: saleItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    if (saleStatus === "COMPLETED") {
      await createSaleStockHistories({
        tx,
        sale,
        items,
        createdById,
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
        approvalHistories: true,
        receivablePayments: true,
      },
    });
  });
};

const approveSale = async ({ saleId, note, createdById }) => {
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

    if (sale.status !== "PENDING_APPROVAL") {
      const error = new Error("Only pending approval sale can be approved");
      error.status = 400;
      throw error;
    }

    await createSaleStockHistories({
      tx,
      sale,
      items: sale.items,
      createdById,
    });

    await tx.sale.update({
      where: {
        id: saleId,
      },
      data: {
        status: "COMPLETED",
      },
    });

    await tx.saleApprovalHistory.create({
      data: {
        saleId,
        action: "APPROVED",
        note,
        createdById,
      },
    });

    return tx.sale.findUnique({
      where: {
        id: saleId,
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
            product: true,
          },
        },
        approvalHistories: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                username: true,
                role: true,
              },
            },
          },
        },
      },
    });
  });
};

const rejectSale = async ({ saleId, note, createdById }) => {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: {
        id: saleId,
      },
    });

    if (!sale) {
      const error = new Error("Sale not found");
      error.status = 404;
      throw error;
    }

    if (sale.status !== "PENDING_APPROVAL") {
      const error = new Error("Only pending approval sale can be rejected");
      error.status = 400;
      throw error;
    }

    await tx.sale.update({
      where: {
        id: saleId,
      },
      data: {
        status: "REJECTED",
      },
    });

    await tx.saleApprovalHistory.create({
      data: {
        saleId,
        action: "REJECTED",
        note,
        createdById,
      },
    });

    return tx.sale.findUnique({
      where: {
        id: saleId,
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
            product: true,
          },
        },
        approvalHistories: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                username: true,
                role: true,
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
  approveSale,
  rejectSale,
};