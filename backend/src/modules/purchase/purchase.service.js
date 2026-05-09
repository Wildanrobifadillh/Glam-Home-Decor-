const prisma = require("../../config/prisma");
const { generatePurchaseNumber } = require("../../utils/generatePurchaseNumber");
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

const createPurchaseStockHistories = async ({
  tx,
  purchase,
  items,
  createdById,
}) => {
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
      },
    });

    await tx.stockHistory.create({
      data: {
        movementNumber: `STK-IN-${purchase.purchaseNumber}-${index + 1}`,
        productId: item.productId,
        type: "IN",
        quantity: item.quantity,
        stockBefore,
        stockAfter,
        note: `Pembelian ${purchase.purchaseNumber}`,
        createdById,
      },
    });
  }
};

const createPurchaseJournal = async ({
  tx,
  purchase,
  cashBankAccountId,
  paymentMethod,
  createdById,
}) => {
  const inventoryAccount = await getAccountByCode(tx, "1301");
  const payableAccount = await getAccountByCode(tx, "2101");

  const lines = [
    {
      accountId: inventoryAccount.id,
      debit: purchase.totalAmount,
      credit: 0,
      note: `Persediaan dari pembelian ${purchase.purchaseNumber}`,
    },
  ];

  if (purchase.paidAmount > 0) {
    const cashBankAccount = await getCashBankAccountForPayment(
      tx,
      cashBankAccountId,
      paymentMethod
    );

    lines.push({
      accountId: cashBankAccount.accountId,
      debit: 0,
      credit: purchase.paidAmount,
      note: `Pembayaran pembelian ${purchase.purchaseNumber}`,
    });
  }

  if (purchase.remainingAmount > 0) {
    lines.push({
      accountId: payableAccount.id,
      debit: 0,
      credit: purchase.remainingAmount,
      note: `Hutang supplier pembelian ${purchase.purchaseNumber}`,
    });
  }

  await createJournalEntryWithLines({
    tx,
    description: `Jurnal pembelian ${purchase.purchaseNumber}`,
    sourceType: "PURCHASE",
    sourceId: purchase.id,
    lines,
    createdById,
  });
};

const createPayablePaymentJournal = async ({
  tx,
  purchase,
  amount,
  paymentMethod,
  cashBankAccountId,
  createdById,
}) => {
  const payableAccount = await getAccountByCode(tx, "2101");

  const cashBankAccount = await getCashBankAccountForPayment(
    tx,
    cashBankAccountId,
    paymentMethod
  );

  await createJournalEntryWithLines({
    tx,
    description: `Pembayaran hutang supplier ${purchase.purchaseNumber}`,
    sourceType: "PAYABLE_PAYMENT",
    sourceId: purchase.id,
    lines: [
      {
        accountId: payableAccount.id,
        debit: amount,
        credit: 0,
        note: `Pengurangan hutang supplier ${purchase.purchaseNumber}`,
      },
      {
        accountId: cashBankAccount.accountId,
        debit: 0,
        credit: amount,
        note: `Kas/bank keluar pembayaran hutang ${purchase.purchaseNumber}`,
      },
    ],
    createdById,
  });
};

const getAllPurchases = async () => {
  return prisma.purchase.findMany({
    include: {
      supplier: true,
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
      payablePayments: {
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
      payablePayments: {
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

  if (!purchase) {
    const error = new Error("Purchase not found");
    error.status = 404;
    throw error;
  }

  return purchase;
};

const createPurchase = async ({
  supplierId,
  supplierInvoiceNumber,
  paidAmount,
  paymentMethod,
  cashBankAccountId,
  note,
  items,
  createdById,
}) => {
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

    if (paidAmount > totalAmount) {
      const error = new Error("Paid amount cannot exceed total amount");
      error.status = 400;
      throw error;
    }

    const remainingAmount = totalAmount - paidAmount;
    const paymentStatus = getPaymentStatus(totalAmount, paidAmount);
    const purchaseNumber = generatePurchaseNumber();

    const purchase = await tx.purchase.create({
      data: {
        purchaseNumber,
        supplierInvoiceNumber,
        supplierId,
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentStatus,
        paymentMethod,
        cashBankAccountId,
        status: "COMPLETED",
        note,
        createdById,
        items: {
          create: purchaseItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    await createPurchaseStockHistories({
      tx,
      purchase,
      items,
      createdById,
    });

    await createPurchaseJournal({
      tx,
      purchase,
      cashBankAccountId,
      paymentMethod,
      createdById,
    });

    return tx.purchase.findUnique({
      where: {
        id: purchase.id,
      },
      include: {
        supplier: true,
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
        payablePayments: {
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
    });
  });
};

const payPurchase = async ({
  purchaseId,
  amount,
  paymentMethod,
  cashBankAccountId,
  note,
  createdById,
}) => {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: {
        id: purchaseId,
      },
    });

    if (!purchase) {
      const error = new Error("Purchase not found");
      error.status = 404;
      throw error;
    }

    if (purchase.status !== "COMPLETED") {
      const error = new Error("Only completed purchase can receive payment");
      error.status = 400;
      throw error;
    }

    if (purchase.remainingAmount <= 0) {
      const error = new Error("Purchase is already fully paid");
      error.status = 400;
      throw error;
    }

    if (amount > purchase.remainingAmount) {
      const error = new Error("Payment amount cannot exceed remaining amount");
      error.status = 400;
      throw error;
    }

    await getCashBankAccountForPayment(tx, cashBankAccountId, paymentMethod);

    const newPaidAmount = purchase.paidAmount + amount;
    const newRemainingAmount = purchase.remainingAmount - amount;
    const newPaymentStatus = getPaymentStatus(
      purchase.totalAmount,
      newPaidAmount
    );

    await tx.payablePayment.create({
      data: {
        purchaseId,
        amount,
        paymentMethod,
        cashBankAccountId,
        note,
        createdById,
      },
    });

    await tx.purchase.update({
      where: {
        id: purchaseId,
      },
      data: {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
      },
    });

    await createPayablePaymentJournal({
      tx,
      purchase,
      amount,
      paymentMethod,
      cashBankAccountId,
      createdById,
    });

    return tx.purchase.findUnique({
      where: {
        id: purchaseId,
      },
      include: {
        supplier: true,
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
        payablePayments: {
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
  getAllPurchases,
  getPurchaseById,
  createPurchase,
  payPurchase,
};