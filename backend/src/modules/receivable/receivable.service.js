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

const getReceivableAgingDate = (sale) => {
  return sale.dueDate || sale.createdAt;
};

const buildReceivableWhere = ({ paymentStatus, customerId, search } = {}) => {
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
        receivablePayments: {
          some: {},
        },
      },
    ],
  };

  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  if (customerId) {
    where.customerId = customerId;
  }

  if (search) {
    where.AND = [
      {
        OR: [
          {
            saleNumber: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            invoiceNumber: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            customerName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            customerPhone: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      },
    ];
  }

  return where;
};

const formatReceivable = (sale) => {
  const agingDate = getReceivableAgingDate(sale);
  const daysOutstanding = getDaysOutstanding(agingDate);
  const lastPayment = sale.receivablePayments?.[0] || null;

  return {
    id: sale.id,
    saleNumber: sale.saleNumber,
    invoiceNumber: sale.invoiceNumber,
    customerId: sale.customerId,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    totalAmount: sale.totalAmount,
    paidAmount: sale.paidAmount,
    remainingAmount: sale.remainingAmount,
    paymentStatus: sale.paymentStatus,
    status: sale.status,
    dueDate: sale.dueDate,
    daysOutstanding,
    agingBucket:
      sale.remainingAmount > 0 ? getAgingBucket(daysOutstanding) : "PAID",
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
    customer: sale.customer,
    createdBy: sale.createdBy,
    lastPayment,
    paymentCount: sale.receivablePayments?.length || 0,
  };
};

const getAllReceivables = async ({ paymentStatus, customerId, search } = {}) => {
  const where = buildReceivableWhere({
    paymentStatus,
    customerId,
    search,
  });

  const sales = await prisma.sale.findMany({
    where,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  return sales.map(formatReceivable);
};

const getReceivableSummary = async () => {
  const sales = await prisma.sale.findMany({
    where: buildReceivableWhere(),
    include: {
      customer: true,
      receivablePayments: true,
    },
  });

  const summary = {
    invoiceCount: sales.length,
    unpaidCount: 0,
    partialCount: 0,
    paidCount: 0,
    activeReceivableCount: 0,
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
    byCustomer: [],
  };

  const customerMap = new Map();

  for (const sale of sales) {
    summary.totalInvoiceAmount += sale.totalAmount;
    summary.totalPaidAmount += sale.paidAmount;
    summary.totalRemainingAmount += sale.remainingAmount;

    const paymentHistoryAmount = sale.receivablePayments.reduce(
      (total, payment) => total + payment.amount,
      0
    );

    summary.totalPaymentHistoryAmount += paymentHistoryAmount;

    if (sale.paymentStatus === "UNPAID") {
      summary.unpaidCount += 1;
    }

    if (sale.paymentStatus === "PARTIAL") {
      summary.partialCount += 1;
    }

    if (sale.paymentStatus === "PAID") {
      summary.paidCount += 1;
    }

    if (sale.remainingAmount > 0) {
  summary.activeReceivableCount += 1;

  const agingDate = getReceivableAgingDate(sale);
  const daysOutstanding = getDaysOutstanding(agingDate);
  const agingBucket = getAgingBucket(daysOutstanding);

  summary.aging[agingBucket] += sale.remainingAmount;
}

    const customerKey =
      sale.customerId || `${sale.customerName || "Walk-in"}-${sale.customerPhone || ""}`;

    if (!customerMap.has(customerKey)) {
      customerMap.set(customerKey, {
        customerId: sale.customerId,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        invoiceCount: 0,
        totalInvoiceAmount: 0,
        totalPaidAmount: 0,
        totalRemainingAmount: 0,
      });
    }

    const customerSummary = customerMap.get(customerKey);

    customerSummary.invoiceCount += 1;
    customerSummary.totalInvoiceAmount += sale.totalAmount;
    customerSummary.totalPaidAmount += sale.paidAmount;
    customerSummary.totalRemainingAmount += sale.remainingAmount;
  }

  summary.byCustomer = Array.from(customerMap.values()).sort(
    (a, b) => b.totalRemainingAmount - a.totalRemainingAmount
  );

  return summary;
};

const getReceivableBySaleId = async (saleId) => {
  const sale = await prisma.sale.findUnique({
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

  const isReceivable =
    sale.remainingAmount > 0 || sale.receivablePayments.length > 0;

  if (!isReceivable) {
    const error = new Error("Receivable not found for this sale");
    error.status = 404;
    throw error;
  }

  const agingDate = getReceivableAgingDate(sale);
  const daysOutstanding = getDaysOutstanding(agingDate);

  return {
    ...sale,
    daysOutstanding,
    agingBucket:
      sale.remainingAmount > 0 ? getAgingBucket(daysOutstanding) : "PAID",
  };
};

module.exports = {
  getAllReceivables,
  getReceivableSummary,
  getReceivableBySaleId,
};