const prisma = require("../../config/prisma");
const { generateSaleNumber } = require("../../utils/generateSaleNumber");
const {
  createJournalEntryWithLines,
  getAccountByCode,
  getCashBankAccountForPayment,
} = require("../../utils/accountingJournal");

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

const createSaleJournal = async ({
  tx,
  sale,
  saleItems,
  cashBankAccountId,
  paymentMethod,
  createdById,
}) => {
  const salesRevenueAccount = await getAccountByCode(tx, "4101");
  const cogsAccount = await getAccountByCode(tx, "5101");
  const inventoryAccount = await getAccountByCode(tx, "1301");

  const lines = [];

  if (sale.paidAmount > 0) {
    const cashBankAccount = await getCashBankAccountForPayment(
      tx,
      cashBankAccountId,
      paymentMethod
    );

    lines.push({
      accountId: cashBankAccount.accountId,
      debit: sale.paidAmount,
      credit: 0,
      note: `Pembayaran penjualan ${sale.saleNumber}`,
    });
  }

  if (sale.remainingAmount > 0) {
    const receivableAccount = await getAccountByCode(tx, "1201");

    lines.push({
      accountId: receivableAccount.id,
      debit: sale.remainingAmount,
      credit: 0,
      note: `Piutang penjualan ${sale.saleNumber}`,
    });
  }

  lines.push({
    accountId: salesRevenueAccount.id,
    debit: 0,
    credit: sale.totalAmount,
    note: `Penjualan ${sale.saleNumber}`,
  });

  const totalCost = saleItems.reduce((total, item) => {
    return total + item.costPrice * item.quantity;
  }, 0);

  if (totalCost > 0) {
    lines.push({
      accountId: cogsAccount.id,
      debit: totalCost,
      credit: 0,
      note: `HPP penjualan ${sale.saleNumber}`,
    });

    lines.push({
      accountId: inventoryAccount.id,
      debit: 0,
      credit: totalCost,
      note: `Pengurangan persediaan penjualan ${sale.saleNumber}`,
    });
  }

  await createJournalEntryWithLines({
    tx,
    description: `Jurnal penjualan ${sale.saleNumber}`,
    sourceType: "SALE",
    sourceId: sale.id,
    lines,
    createdById,
  });
};

const createReceivablePaymentJournal = async ({
  tx,
  sale,
  amount,
  paymentMethod,
  cashBankAccountId,
  createdById,
}) => {
  const cashBankAccount = await getCashBankAccountForPayment(
    tx,
    cashBankAccountId,
    paymentMethod
  );

  const receivableAccount = await getAccountByCode(tx, "1201");

  await createJournalEntryWithLines({
    tx,
    description: `Pembayaran piutang ${sale.saleNumber}`,
    sourceType: "RECEIVABLE_PAYMENT",
    sourceId: sale.id,
    lines: [
      {
        accountId: cashBankAccount.accountId,
        debit: amount,
        credit: 0,
        note: `Kas/bank masuk pembayaran piutang ${sale.saleNumber}`,
      },
      {
        accountId: receivableAccount.id,
        debit: 0,
        credit: amount,
        note: `Pengurangan piutang ${sale.saleNumber}`,
      },
    ],
    createdById,
  });
};

const getAllSales = async () => {
  return prisma.sale.findMany({
    include: {
      customer: true,
      cashBankAccount: true,
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
          cashBankAccount: true,
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
      cashBankAccount: true,
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
          cashBankAccount: true,
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
  cashBankAccountId,
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

    if (paidAmount > 0) {
      await getCashBankAccountForPayment(
        tx,
        cashBankAccountId,
        paymentMethod
      );
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
    const needsOwnerApproval = isReceivable && createdByRole !== "OWNER";

    const saleStatus = needsOwnerApproval ? "PENDING_APPROVAL" : "COMPLETED";

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
        cashBankAccountId,
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

      await createSaleJournal({
        tx,
        sale,
        saleItems: saleItemsData,
        cashBankAccountId,
        paymentMethod,
        createdById,
      });
    }

    return tx.sale.findUnique({
      where: {
        id: sale.id,
      },
      include: {
        customer: true,
        cashBankAccount: true,
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

    await createSaleJournal({
      tx,
      sale,
      saleItems: sale.items,
      cashBankAccountId: sale.cashBankAccountId,
      paymentMethod: sale.paymentMethod,
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
        cashBankAccount: true,
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
        cashBankAccount: true,
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

const paySale = async ({
  saleId,
  amount,
  paymentMethod,
  cashBankAccountId,
  note,
  createdById,
}) => {
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

    if (sale.status !== "COMPLETED") {
      const error = new Error("Only completed sale can receive payment");
      error.status = 400;
      throw error;
    }

    if (sale.remainingAmount <= 0) {
      const error = new Error("Sale is already fully paid");
      error.status = 400;
      throw error;
    }

    if (amount > sale.remainingAmount) {
      const error = new Error("Payment amount cannot exceed remaining amount");
      error.status = 400;
      throw error;
    }

    await getCashBankAccountForPayment(tx, cashBankAccountId, paymentMethod);

    const newPaidAmount = sale.paidAmount + amount;
    const newRemainingAmount = sale.remainingAmount - amount;
    const newPaymentStatus = getPaymentStatus(sale.totalAmount, newPaidAmount);

    await tx.receivablePayment.create({
      data: {
        saleId,
        amount,
        paymentMethod,
        cashBankAccountId,
        note,
        createdById,
      },
    });

    await tx.sale.update({
      where: {
        id: saleId,
      },
      data: {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
      },
    });

    await createReceivablePaymentJournal({
      tx,
      sale,
      amount,
      paymentMethod,
      cashBankAccountId,
      createdById,
    });

    return tx.sale.findUnique({
      where: {
        id: saleId,
      },
      include: {
        customer: true,
        cashBankAccount: true,
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
            cashBankAccount: true,
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
  });
};

module.exports = {
  getAllSales,
  getSaleById,
  createSale,
  approveSale,
  rejectSale,
  paySale,
};