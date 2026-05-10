const prisma = require("../../config/prisma");

const VALID_PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID"];

const getDaysOutstanding = (date) => {
  const now = new Date();
  const startDate = new Date(date);
  const diffTime = now.getTime() - startDate.getTime();

  return Math.max(Math.floor(diffTime / (1000 * 60 * 60 * 24)), 0);
};

const getAgingBucket = (daysOutstanding) => {
  if (daysOutstanding <= 30) {
    return "0-30";
  }

  if (daysOutstanding <= 60) {
    return "31-60";
  }

  if (daysOutstanding <= 90) {
    return "61-90";
  }

  return "90+";
};

const buildPayableWhere = ({ paymentStatus, supplierId, search } = {}) => {
  if (paymentStatus && !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
    const error = new Error("Invalid payment status");
    error.status = 400;
    throw error;
  }

  const where = {
    status: "COMPLETED",
    OR: [
      {
        remainingAmount: {
          gt: 0,
        },
      },
      {
        payablePayments: {
          some: {},
        },
      },
    ],
  };

  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  if (supplierId) {
    where.supplierId = supplierId;
  }

  if (search) {
    where.AND = [
      {
        OR: [
          {
            purchaseNumber: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            supplierInvoiceNumber: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            supplier: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        ],
      },
    ];
  }

  return where;
};

const formatPayable = (purchase) => {
  const daysOutstanding = getDaysOutstanding(purchase.createdAt);
  const lastPayment = purchase.payablePayments?.[0] || null;

  return {
    id: purchase.id,
    purchaseNumber: purchase.purchaseNumber,
    supplierInvoiceNumber: purchase.supplierInvoiceNumber,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplier?.name || null,
    supplierPhone: purchase.supplier?.phone || null,
    totalAmount: purchase.totalAmount,
    paidAmount: purchase.paidAmount,
    remainingAmount: purchase.remainingAmount,
    paymentStatus: purchase.paymentStatus,
    status: purchase.status,
    daysOutstanding,
    agingBucket:
      purchase.remainingAmount > 0 ? getAgingBucket(daysOutstanding) : "PAID",
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
    supplier: purchase.supplier,
    createdBy: purchase.createdBy,
    lastPayment,
    paymentCount: purchase.payablePayments?.length || 0,
  };
};

const getAllPayables = async ({ paymentStatus, supplierId, search } = {}) => {
  const where = buildPayableWhere({
    paymentStatus,
    supplierId,
    search,
  });

  const purchases = await prisma.purchase.findMany({
    where,
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

  return purchases.map(formatPayable);
};

const getPayableSummary = async () => {
  const purchases = await prisma.purchase.findMany({
    where: buildPayableWhere(),
    include: {
      supplier: true,
      payablePayments: true,
    },
  });

  const summary = {
    invoiceCount: purchases.length,
    unpaidCount: 0,
    partialCount: 0,
    paidCount: 0,
    activePayableCount: 0,
    totalInvoiceAmount: 0,
    totalPaidAmount: 0,
    totalRemainingAmount: 0,
    totalPaymentHistoryAmount: 0,
    aging: {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    },
    bySupplier: [],
  };

  const supplierMap = new Map();

  for (const purchase of purchases) {
    summary.totalInvoiceAmount += purchase.totalAmount;
    summary.totalPaidAmount += purchase.paidAmount;
    summary.totalRemainingAmount += purchase.remainingAmount;

    const paymentHistoryAmount = purchase.payablePayments.reduce(
      (total, payment) => total + payment.amount,
      0
    );

    summary.totalPaymentHistoryAmount += paymentHistoryAmount;

    if (purchase.paymentStatus === "UNPAID") {
      summary.unpaidCount += 1;
    }

    if (purchase.paymentStatus === "PARTIAL") {
      summary.partialCount += 1;
    }

    if (purchase.paymentStatus === "PAID") {
      summary.paidCount += 1;
    }

    if (purchase.remainingAmount > 0) {
      summary.activePayableCount += 1;

      const daysOutstanding = getDaysOutstanding(purchase.createdAt);
      const agingBucket = getAgingBucket(daysOutstanding);

      summary.aging[agingBucket] += purchase.remainingAmount;
    }

    const supplierKey = purchase.supplierId;

    if (!supplierMap.has(supplierKey)) {
      supplierMap.set(supplierKey, {
        supplierId: purchase.supplierId,
        supplierName: purchase.supplier?.name || null,
        supplierPhone: purchase.supplier?.phone || null,
        invoiceCount: 0,
        totalInvoiceAmount: 0,
        totalPaidAmount: 0,
        totalRemainingAmount: 0,
      });
    }

    const supplierSummary = supplierMap.get(supplierKey);

    supplierSummary.invoiceCount += 1;
    supplierSummary.totalInvoiceAmount += purchase.totalAmount;
    supplierSummary.totalPaidAmount += purchase.paidAmount;
    supplierSummary.totalRemainingAmount += purchase.remainingAmount;
  }

  summary.bySupplier = Array.from(supplierMap.values()).sort(
    (a, b) => b.totalRemainingAmount - a.totalRemainingAmount
  );

  return summary;
};

const getPayableByPurchaseId = async (purchaseId) => {
  const purchase = await prisma.purchase.findUnique({
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

  if (!purchase) {
    const error = new Error("Purchase not found");
    error.status = 404;
    throw error;
  }

  const isPayable =
    purchase.remainingAmount > 0 || purchase.payablePayments.length > 0;

  if (!isPayable) {
    const error = new Error("Payable not found for this purchase");
    error.status = 404;
    throw error;
  }

  const daysOutstanding = getDaysOutstanding(purchase.createdAt);

  return {
    ...purchase,
    daysOutstanding,
    agingBucket:
      purchase.remainingAmount > 0 ? getAgingBucket(daysOutstanding) : "PAID",
  };
};

module.exports = {
  getAllPayables,
  getPayableSummary,
  getPayableByPurchaseId,
};