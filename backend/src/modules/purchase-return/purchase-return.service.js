const prisma = require("../../config/prisma");
const {
  generatePurchaseReturnNumber,
} = require("../../utils/generatePurchaseReturnNumber");
const {
  createJournalEntryWithLines,
  getAccountByCode,
  getCashBankAccountForPayment,
} = require("../../utils/accountingJournal");

const getPaymentStatusAfterReturn = ({ paidAmount, remainingAmount }) => {
  if (remainingAmount <= 0) {
    return "PAID";
  }

  if (paidAmount > 0) {
    return "PARTIAL";
  }

  return "UNPAID";
};

const getPurchaseReturnInclude = () => ({
  purchase: {
    include: {
      supplier: true,
    },
  },
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
});

const getAllPurchaseReturns = async () => {
  return prisma.purchaseReturn.findMany({
    include: getPurchaseReturnInclude(),
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
    include: getPurchaseReturnInclude(),
  });

  if (!purchaseReturn) {
    const error = new Error("Purchase return not found");
    error.status = 404;
    throw error;
  }

  return purchaseReturn;
};

const createPurchaseReturnJournal = async ({
  tx,
  purchaseReturn,
  payableReductionAmount,
  refundAmount,
  paymentMethod,
  cashBankAccountId,
  createdById,
}) => {
  const inventoryAccount = await getAccountByCode(tx, "1301");

  const lines = [];

  if (payableReductionAmount > 0) {
    const payableAccount = await getAccountByCode(tx, "2101");

    lines.push({
      accountId: payableAccount.id,
      debit: payableReductionAmount,
      credit: 0,
      note: `Pengurangan hutang supplier retur pembelian ${purchaseReturn.returnNumber}`,
    });
  }

  if (refundAmount > 0) {
    const cashBankAccount = await getCashBankAccountForPayment(
      tx,
      cashBankAccountId,
      paymentMethod
    );

    lines.push({
      accountId: cashBankAccount.accountId,
      debit: refundAmount,
      credit: 0,
      note: `Refund supplier retur pembelian ${purchaseReturn.returnNumber}`,
    });
  }

  lines.push({
    accountId: inventoryAccount.id,
    debit: 0,
    credit: purchaseReturn.totalAmount,
    note: `Pengurangan persediaan retur pembelian ${purchaseReturn.returnNumber}`,
  });

  await createJournalEntryWithLines({
    tx,
    description: `Jurnal retur pembelian ${purchaseReturn.returnNumber}`,
    sourceType: "PURCHASE_RETURN",
    sourceId: purchaseReturn.id,
    lines,
    createdById,
  });
};

const createPurchaseReturn = async ({
  purchaseId,
  paymentMethod,
  cashBankAccountId,
  note,
  items,
  createdById,
}) => {
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

    const payableReductionAmount = Math.min(
      totalAmount,
      purchase.remainingAmount
    );

    const refundAmount = totalAmount - payableReductionAmount;

    if (refundAmount > 0 && !cashBankAccountId) {
      const error = new Error("Cash/bank account is required for supplier refund");
      error.status = 400;
      throw error;
    }

    if (refundAmount > 0) {
      await getCashBankAccountForPayment(tx, cashBankAccountId, paymentMethod);
    }

    const returnNumber = generatePurchaseReturnNumber();

    const purchaseReturn = await tx.purchaseReturn.create({
      data: {
        returnNumber,
        purchaseId,
        totalAmount,
        payableReductionAmount,
        refundAmount,
        paymentMethod: refundAmount > 0 ? paymentMethod : null,
        cashBankAccountId: refundAmount > 0 ? cashBankAccountId : null,
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

    const newRemainingAmount =
      purchase.remainingAmount - payableReductionAmount;

    const newPaymentStatus = getPaymentStatusAfterReturn({
      paidAmount: purchase.paidAmount,
      remainingAmount: newRemainingAmount,
    });

    await tx.purchase.update({
      where: {
        id: purchaseId,
      },
      data: {
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
      },
    });

    await createPurchaseReturnJournal({
      tx,
      purchaseReturn,
      payableReductionAmount,
      refundAmount,
      paymentMethod,
      cashBankAccountId,
      createdById,
    });

    return tx.purchaseReturn.findUnique({
      where: {
        id: purchaseReturn.id,
      },
      include: getPurchaseReturnInclude(),
    });
  });
};

module.exports = {
  getAllPurchaseReturns,
  getPurchaseReturnById,
  createPurchaseReturn,
};