const prisma = require("../../config/prisma");
const {
  generateSaleReturnNumber,
} = require("../../utils/generateSaleReturnNumber");
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

const getSaleReturnInclude = () => ({
  sale: {
    include: {
      customer: true,
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

const getAllSaleReturns = async () => {
  return prisma.saleReturn.findMany({
    include: getSaleReturnInclude(),
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
    include: getSaleReturnInclude(),
  });

  if (!saleReturn) {
    const error = new Error("Sale return not found");
    error.status = 404;
    throw error;
  }

  return saleReturn;
};

const createSaleReturnJournal = async ({
  tx,
  sale,
  saleReturn,
  saleReturnItemsData,
  receivableReductionAmount,
  refundAmount,
  paymentMethod,
  cashBankAccountId,
  createdById,
}) => {
  const salesReturnAccount = await getAccountByCode(tx, "4102");

  const lines = [
    {
      accountId: salesReturnAccount.id,
      debit: saleReturn.totalAmount,
      credit: 0,
      note: `Retur penjualan ${saleReturn.returnNumber}`,
    },
  ];

  if (receivableReductionAmount > 0) {
    const receivableAccount = await getAccountByCode(tx, "1201");

    lines.push({
      accountId: receivableAccount.id,
      debit: 0,
      credit: receivableReductionAmount,
      note: `Pengurangan piutang retur penjualan ${saleReturn.returnNumber}`,
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
      debit: 0,
      credit: refundAmount,
      note: `Refund retur penjualan ${saleReturn.returnNumber}`,
    });
  }

  const saleableReturnCost = saleReturnItemsData
    .filter((item) => item.condition === "SALEABLE")
    .reduce((total, item) => total + item.costPrice * item.quantity, 0);

  if (saleableReturnCost > 0) {
    const inventoryAccount = await getAccountByCode(tx, "1301");
    const cogsAccount = await getAccountByCode(tx, "5101");

    lines.push({
      accountId: inventoryAccount.id,
      debit: saleableReturnCost,
      credit: 0,
      note: `Persediaan kembali dari retur ${saleReturn.returnNumber}`,
    });

    lines.push({
      accountId: cogsAccount.id,
      debit: 0,
      credit: saleableReturnCost,
      note: `Pengurangan HPP dari retur ${saleReturn.returnNumber}`,
    });
  }

  await createJournalEntryWithLines({
    tx,
    description: `Jurnal retur penjualan ${saleReturn.returnNumber}`,
    sourceType: "SALE_RETURN",
    sourceId: saleReturn.id,
    lines,
    createdById,
  });
};

const createSaleReturn = async ({
  saleId,
  paymentMethod,
  cashBankAccountId,
  note,
  items,
  createdById,
}) => {
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
        costPrice: saleItem.costPrice,
        subtotal,
        condition: item.condition,
        note: item.note,
      };
    });

    const receivableReductionAmount = Math.min(
      totalAmount,
      sale.remainingAmount
    );

    const refundAmount = totalAmount - receivableReductionAmount;

    if (refundAmount > 0 && !cashBankAccountId) {
      const error = new Error("Cash/bank account is required for refund");
      error.status = 400;
      throw error;
    }

    if (refundAmount > 0) {
      await getCashBankAccountForPayment(tx, cashBankAccountId, paymentMethod);
    }

    const returnNumber = generateSaleReturnNumber();

    const saleReturn = await tx.saleReturn.create({
      data: {
        returnNumber,
        saleId,
        totalAmount,
        receivableReductionAmount,
        refundAmount,
        paymentMethod: refundAmount > 0 ? paymentMethod : null,
        cashBankAccountId: refundAmount > 0 ? cashBankAccountId : null,
        note,
        createdById,
        items: {
          create: saleReturnItemsData.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            subtotal: item.subtotal,
            condition: item.condition,
            note: item.note,
          })),
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

    const newRemainingAmount =
      sale.remainingAmount - receivableReductionAmount;

    const newPaymentStatus = getPaymentStatusAfterReturn({
      paidAmount: sale.paidAmount,
      remainingAmount: newRemainingAmount,
    });

    await tx.sale.update({
      where: {
        id: saleId,
      },
      data: {
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
      },
    });

    await createSaleReturnJournal({
      tx,
      sale,
      saleReturn,
      saleReturnItemsData,
      receivableReductionAmount,
      refundAmount,
      paymentMethod,
      cashBankAccountId,
      createdById,
    });

    return tx.saleReturn.findUnique({
      where: {
        id: saleReturn.id,
      },
      include: getSaleReturnInclude(),
    });
  });
};

module.exports = {
  getAllSaleReturns,
  getSaleReturnById,
  createSaleReturn,
};