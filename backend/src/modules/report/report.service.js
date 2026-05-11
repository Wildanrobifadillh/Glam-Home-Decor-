const prisma = require("../../config/prisma");

const buildDateRange = ({ startDate, endDate } = {}) => {
  const range = {};

  if (startDate) {
    range.gte = new Date(startDate);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }

  return Object.keys(range).length > 0 ? range : undefined;
};

const buildTransactionDateWhere = ({ startDate, endDate } = {}) => {
  const dateRange = buildDateRange({ startDate, endDate });

  if (!dateRange) {
    return {};
  }

  return {
    createdAt: dateRange,
  };
};

const buildJournalWhere = ({ startDate, endDate } = {}) => {
  const dateRange = buildDateRange({ startDate, endDate });

  const where = {
    status: "POSTED",
  };

  if (dateRange) {
    where.entryDate = dateRange;
  }

  return where;
};

const getBalanceChangeByNormalBalance = ({ account, debit, credit }) => {
  if (account.normalBalance === "DEBIT") {
    return debit - credit;
  }

  return credit - debit;
};

const getSalesReport = async ({ startDate, endDate } = {}) => {
  const sales = await prisma.sale.findMany({
    where: {
      status: "COMPLETED",
      ...buildTransactionDateWhere({ startDate, endDate }),
    },
    select: {
      id: true,
      saleNumber: true,
      customerName: true,
      customerPhone: true,
      totalAmount: true,
      paidAmount: true,
      remainingAmount: true,
      paymentStatus: true,
      paymentMethod: true,
      status: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          sellingPrice: true,
          subtotal: true,
          product: {
            select: {
              id: true,
              name: true,
              unit: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const summary = {
    saleCount: sales.length,
    totalSales: 0,
    totalPaid: 0,
    totalRemaining: 0,
    byPaymentStatus: {
      PAID: 0,
      PARTIAL: 0,
      UNPAID: 0,
    },
    byPaymentMethod: {
      CASH: 0,
      TRANSFER: 0,
    },
  };

  for (const sale of sales) {
    summary.totalSales += sale.totalAmount;
    summary.totalPaid += sale.paidAmount;
    summary.totalRemaining += sale.remainingAmount;

    if (summary.byPaymentStatus[sale.paymentStatus] !== undefined) {
      summary.byPaymentStatus[sale.paymentStatus] += sale.totalAmount;
    }

    if (summary.byPaymentMethod[sale.paymentMethod] !== undefined) {
      summary.byPaymentMethod[sale.paymentMethod] += sale.totalAmount;
    }
  }

  return {
    summary,
    sales,
  };
};

const getPurchaseReport = async ({ startDate, endDate } = {}) => {
  const purchases = await prisma.purchase.findMany({
    where: {
      status: "COMPLETED",
      ...buildTransactionDateWhere({ startDate, endDate }),
    },
    include: {
      supplier: true,
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

  const summary = {
    purchaseCount: purchases.length,
    totalPurchases: 0,
    totalPaid: 0,
    totalRemaining: 0,
    byPaymentStatus: {
      PAID: 0,
      PARTIAL: 0,
      UNPAID: 0,
    },
    byPaymentMethod: {
      CASH: 0,
      TRANSFER: 0,
    },
  };

  for (const purchase of purchases) {
    summary.totalPurchases += purchase.totalAmount;
    summary.totalPaid += purchase.paidAmount;
    summary.totalRemaining += purchase.remainingAmount;

    if (summary.byPaymentStatus[purchase.paymentStatus] !== undefined) {
      summary.byPaymentStatus[purchase.paymentStatus] += purchase.totalAmount;
    }

    if (summary.byPaymentMethod[purchase.paymentMethod] !== undefined) {
      summary.byPaymentMethod[purchase.paymentMethod] += purchase.totalAmount;
    }
  }

  return {
    summary,
    purchases,
  };
};

const getReceivableReport = async ({ startDate, endDate } = {}) => {
  const sales = await prisma.sale.findMany({
    where: {
      status: "COMPLETED",
      remainingAmount: {
        gt: 0,
      },
      ...buildTransactionDateWhere({ startDate, endDate }),
    },
    include: {
      customer: true,
      receivablePayments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const summary = {
    receivableCount: sales.length,
    totalInvoiceAmount: 0,
    totalPaidAmount: 0,
    totalRemainingAmount: 0,
    aging: {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    },
  };

  const today = new Date();

  const receivables = sales.map((sale) => {
    const createdAt = new Date(sale.createdAt);
    const diffTime = today.getTime() - createdAt.getTime();
    const daysOutstanding = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let agingBucket = "0-30";

    if (daysOutstanding > 90) {
      agingBucket = "90+";
    } else if (daysOutstanding > 60) {
      agingBucket = "61-90";
    } else if (daysOutstanding > 30) {
      agingBucket = "31-60";
    }

    summary.totalInvoiceAmount += sale.totalAmount;
    summary.totalPaidAmount += sale.paidAmount;
    summary.totalRemainingAmount += sale.remainingAmount;
    summary.aging[agingBucket] += sale.remainingAmount;

    return {
      ...sale,
      daysOutstanding,
      agingBucket,
    };
  });

  return {
    summary,
    receivables,
  };
};

const getPayableReport = async ({ startDate, endDate } = {}) => {
  const purchases = await prisma.purchase.findMany({
    where: {
      status: "COMPLETED",
      remainingAmount: {
        gt: 0,
      },
      ...buildTransactionDateWhere({ startDate, endDate }),
    },
    include: {
      supplier: true,
      payablePayments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const summary = {
    payableCount: purchases.length,
    totalInvoiceAmount: 0,
    totalPaidAmount: 0,
    totalRemainingAmount: 0,
    aging: {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    },
  };

  const today = new Date();

  const payables = purchases.map((purchase) => {
    const createdAt = new Date(purchase.createdAt);
    const diffTime = today.getTime() - createdAt.getTime();
    const daysOutstanding = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let agingBucket = "0-30";

    if (daysOutstanding > 90) {
      agingBucket = "90+";
    } else if (daysOutstanding > 60) {
      agingBucket = "61-90";
    } else if (daysOutstanding > 30) {
      agingBucket = "31-60";
    }

    summary.totalInvoiceAmount += purchase.totalAmount;
    summary.totalPaidAmount += purchase.paidAmount;
    summary.totalRemainingAmount += purchase.remainingAmount;
    summary.aging[agingBucket] += purchase.remainingAmount;

    return {
      ...purchase,
      daysOutstanding,
      agingBucket,
    };
  });

  return {
    summary,
    payables,
  };
};

const getCashBankReport = async ({ startDate, endDate } = {}) => {
  const cashBankAccounts = await prisma.cashBankAccount.findMany({
    include: {
      account: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const cashBankAccountIds = cashBankAccounts.map(
    (cashBankAccount) => cashBankAccount.accountId
  );

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId: {
        in: cashBankAccountIds,
      },
      journalEntry: buildJournalWhere({ startDate, endDate }),
    },
    include: {
      account: true,
      journalEntry: true,
    },
    orderBy: {
      journalEntry: {
        entryDate: "desc",
      },
    },
  });

  const summary = {
    cashBankAccountCount: cashBankAccounts.length,
    totalCurrentBalance: 0,
    totalInflow: 0,
    totalOutflow: 0,
    netChange: 0,
  };

  const accountMap = new Map();

  for (const cashBankAccount of cashBankAccounts) {
    summary.totalCurrentBalance += cashBankAccount.currentBalance;

    accountMap.set(cashBankAccount.accountId, {
      cashBankAccount,
      currentBalance: cashBankAccount.currentBalance,
      inflow: 0,
      outflow: 0,
      netChange: 0,
      movements: [],
    });
  }

  for (const line of lines) {
    const reportItem = accountMap.get(line.accountId);

    if (!reportItem) {
      continue;
    }

    reportItem.inflow += line.debit;
    reportItem.outflow += line.credit;
    reportItem.netChange += line.debit - line.credit;

    summary.totalInflow += line.debit;
    summary.totalOutflow += line.credit;
    summary.netChange += line.debit - line.credit;

    reportItem.movements.push({
      journalEntryId: line.journalEntryId,
      entryNumber: line.journalEntry.entryNumber,
      entryDate: line.journalEntry.entryDate,
      sourceType: line.journalEntry.sourceType,
      description: line.journalEntry.description,
      debit: line.debit,
      credit: line.credit,
      netChange: line.debit - line.credit,
      note: line.note,
    });
  }

  return {
    summary,
    cashBankAccounts: Array.from(accountMap.values()),
  };
};

const getGeneralLedger = async ({ accountId, startDate, endDate }) => {
  const account = await prisma.account.findUnique({
    where: {
      id: accountId,
    },
  });

  if (!account) {
    const error = new Error("Account not found");
    error.status = 404;
    throw error;
  }

  let openingBalance = 0;

  if (startDate) {
    const openingLines = await prisma.journalLine.findMany({
      where: {
        accountId,
        journalEntry: {
          status: "POSTED",
          entryDate: {
            lt: new Date(startDate),
          },
        },
      },
    });

    openingBalance = openingLines.reduce((total, line) => {
      return (
        total +
        getBalanceChangeByNormalBalance({
          account,
          debit: line.debit,
          credit: line.credit,
        })
      );
    }, 0);
  }

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId,
      journalEntry: buildJournalWhere({ startDate, endDate }),
    },
    include: {
      journalEntry: true,
      account: true,
    },
    orderBy: {
      journalEntry: {
        entryDate: "asc",
      },
    },
  });

  let runningBalance = openingBalance;

  const ledgerLines = lines.map((line) => {
    const balanceChange = getBalanceChangeByNormalBalance({
      account,
      debit: line.debit,
      credit: line.credit,
    });

    runningBalance += balanceChange;

    return {
      journalEntryId: line.journalEntryId,
      entryNumber: line.journalEntry.entryNumber,
      entryDate: line.journalEntry.entryDate,
      sourceType: line.journalEntry.sourceType,
      description: line.journalEntry.description,
      debit: line.debit,
      credit: line.credit,
      balanceChange,
      runningBalance,
      note: line.note,
    };
  });

  const totalDebit = lines.reduce((total, line) => total + line.debit, 0);
  const totalCredit = lines.reduce((total, line) => total + line.credit, 0);

  return {
    account,
    summary: {
      openingBalance,
      totalDebit,
      totalCredit,
      endingBalance: runningBalance,
    },
    lines: ledgerLines,
  };
};

const getProfitLossReport = async ({ startDate, endDate } = {}) => {
  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: buildJournalWhere({ startDate, endDate }),
      account: {
        type: {
          in: ["REVENUE", "COGS", "EXPENSE"],
        },
      },
    },
    include: {
      account: true,
      journalEntry: true,
    },
  });

  const accountMap = new Map();

  for (const line of lines) {
    if (!accountMap.has(line.accountId)) {
      accountMap.set(line.accountId, {
        accountId: line.accountId,
        accountCode: line.account.code,
        accountName: line.account.name,
        accountType: line.account.type,
        normalBalance: line.account.normalBalance,
        debit: 0,
        credit: 0,
        balance: 0,
      });
    }

    const item = accountMap.get(line.accountId);
    item.debit += line.debit;
    item.credit += line.credit;
  }

  for (const item of accountMap.values()) {
    item.balance = getBalanceChangeByNormalBalance({
      account: item,
      debit: item.debit,
      credit: item.credit,
    });
  }

  const revenueAccounts = Array.from(accountMap.values()).filter(
    (account) => account.accountType === "REVENUE"
  );

  const cogsAccounts = Array.from(accountMap.values()).filter(
    (account) => account.accountType === "COGS"
  );

  const expenseAccounts = Array.from(accountMap.values()).filter(
    (account) => account.accountType === "EXPENSE"
  );

  const totalRevenue = revenueAccounts.reduce(
    (total, account) => total + account.balance,
    0
  );

  const totalCOGS = cogsAccounts.reduce(
    (total, account) => total + account.balance,
    0
  );

  const totalExpense = expenseAccounts.reduce(
    (total, account) => total + account.balance,
    0
  );

  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpense;

  return {
    summary: {
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalExpense,
      netProfit,
    },
    revenueAccounts,
    cogsAccounts,
    expenseAccounts,
  };
};

const getCashFlowReport = async ({ startDate, endDate } = {}) => {
  const cashBankAccounts = await prisma.cashBankAccount.findMany({
    include: {
      account: true,
    },
  });

  const cashBankAccountIds = cashBankAccounts.map(
    (cashBankAccount) => cashBankAccount.accountId
  );

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId: {
        in: cashBankAccountIds,
      },
      journalEntry: buildJournalWhere({ startDate, endDate }),
    },
    include: {
      journalEntry: true,
      account: true,
    },
    orderBy: {
      journalEntry: {
        entryDate: "asc",
      },
    },
  });

  const summary = {
    totalCashInflow: 0,
    totalCashOutflow: 0,
    netCashFlow: 0,
    bySourceType: {},
  };

  const movements = lines.map((line) => {
    const amount = line.debit - line.credit;
    const sourceType = line.journalEntry.sourceType;

    if (!summary.bySourceType[sourceType]) {
      summary.bySourceType[sourceType] = {
        inflow: 0,
        outflow: 0,
        net: 0,
      };
    }

    if (amount >= 0) {
      summary.totalCashInflow += amount;
      summary.bySourceType[sourceType].inflow += amount;
    } else {
      summary.totalCashOutflow += Math.abs(amount);
      summary.bySourceType[sourceType].outflow += Math.abs(amount);
    }

    summary.netCashFlow += amount;
    summary.bySourceType[sourceType].net += amount;

    return {
      journalEntryId: line.journalEntryId,
      entryNumber: line.journalEntry.entryNumber,
      entryDate: line.journalEntry.entryDate,
      sourceType,
      description: line.journalEntry.description,
      accountId: line.accountId,
      accountCode: line.account.code,
      accountName: line.account.name,
      inflow: amount > 0 ? amount : 0,
      outflow: amount < 0 ? Math.abs(amount) : 0,
      netChange: amount,
      note: line.note,
    };
  });

  return {
    summary,
    movements,
  };
};

const getBalanceSheetReport = async ({ endDate } = {}) => {
  const journalWhere = {
    status: "POSTED",
  };

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    journalWhere.entryDate = {
      lte: end,
    };
  }

  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: journalWhere,
    },
    include: {
      account: true,
      journalEntry: true,
    },
  });

  const accountMap = new Map();

  for (const line of lines) {
    if (!accountMap.has(line.accountId)) {
      accountMap.set(line.accountId, {
        accountId: line.accountId,
        accountCode: line.account.code,
        accountName: line.account.name,
        accountType: line.account.type,
        normalBalance: line.account.normalBalance,
        debit: 0,
        credit: 0,
        balance: 0,
      });
    }

    const item = accountMap.get(line.accountId);
    item.debit += line.debit;
    item.credit += line.credit;
  }

  for (const item of accountMap.values()) {
    item.balance = getBalanceChangeByNormalBalance({
      account: item,
      debit: item.debit,
      credit: item.credit,
    });
  }

  const accounts = Array.from(accountMap.values());

  const assets = accounts.filter((account) => account.accountType === "ASSET");
  const liabilities = accounts.filter(
    (account) => account.accountType === "LIABILITY"
  );
  const equities = accounts.filter(
    (account) => account.accountType === "EQUITY"
  );
  const revenues = accounts.filter(
    (account) => account.accountType === "REVENUE"
  );
  const cogs = accounts.filter((account) => account.accountType === "COGS");
  const expenses = accounts.filter(
    (account) => account.accountType === "EXPENSE"
  );

  const totalAssets = assets.reduce(
    (total, account) => total + account.balance,
    0
  );

  const totalLiabilities = liabilities.reduce(
    (total, account) => total + account.balance,
    0
  );

  const totalEquityAccounts = equities.reduce(
    (total, account) => total + account.balance,
    0
  );

  const totalRevenue = revenues.reduce(
    (total, account) => total + account.balance,
    0
  );

  const totalCOGS = cogs.reduce((total, account) => total + account.balance, 0);

  const totalExpense = expenses.reduce(
    (total, account) => total + account.balance,
    0
  );

  const currentPeriodProfit = totalRevenue - totalCOGS - totalExpense;
  const totalEquity = totalEquityAccounts + currentPeriodProfit;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return {
    summary: {
      totalAssets,
      totalLiabilities,
      totalEquityAccounts,
      currentPeriodProfit,
      totalEquity,
      totalLiabilitiesAndEquity,
      balanceDifference: totalAssets - totalLiabilitiesAndEquity,
    },
    assets,
    liabilities,
    equities,
    currentPeriodProfit,
  };
};

const getOwnerSummary = async ({ startDate, endDate } = {}) => {
  const profitLoss = await getProfitLossReport({ startDate, endDate });
  const cashBank = await getCashBankReport({ startDate, endDate });
  const receivables = await getReceivableReport({ startDate, endDate });
  const payables = await getPayableReport({ startDate, endDate });

  return {
    summary: {
      netProfit: profitLoss.summary.netProfit,
      grossProfit: profitLoss.summary.grossProfit,
      totalRevenue: profitLoss.summary.totalRevenue,
      totalExpense:
        profitLoss.summary.totalCOGS + profitLoss.summary.totalExpense,
      totalCashBankBalance: cashBank.summary.totalCurrentBalance,
      totalReceivables: receivables.summary.totalRemainingAmount,
      totalPayables: payables.summary.totalRemainingAmount,
    },
    profitLoss: profitLoss.summary,
    cashBank: cashBank.summary,
    receivables: receivables.summary,
    payables: payables.summary,
  };
};

module.exports = {
  getSalesReport,
  getPurchaseReport,
  getReceivableReport,
  getPayableReport,
  getCashBankReport,
  getGeneralLedger,
  getProfitLossReport,
  getCashFlowReport,
  getBalanceSheetReport,
  getOwnerSummary,
};