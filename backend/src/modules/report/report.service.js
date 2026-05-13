const ExcelJS = require("exceljs");

const prisma = require("../../config/prisma");
const settingsService = require("../settings/settings.service");

const {
  generateSalesReportPdfBuffer,
} = require("./report.sales-pdf");
const {
  generatePurchaseReportPdfBuffer,
} = require("./report.purchases-pdf");
const {
  generateStockReportPdfBuffer,
} = require("./report.stock-pdf");
const {
  generatePayrollReportPdfBuffer,
} = require("./report.payroll-pdf");

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

const formatDateForExcelFileName = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
};

const formatDateForExcelCell = (value) => {
  if (!value) {
    return "-";
  }

  return new Date(value);
};

const getReportPeriodLabel = ({ startDate, endDate } = {}) => {
  if (startDate && endDate) {
    return `${startDate} s/d ${endDate}`;
  }

  if (startDate) {
    return `Mulai ${startDate}`;
  }

  if (endDate) {
    return `Sampai ${endDate}`;
  }

  return "Semua Periode";
};

const buildSalesExportWhere = ({
  startDate,
  endDate,
  paymentStatus,
  paymentMethod,
  status,
  search,
} = {}) => {
  const where = {
    status: status || "COMPLETED",
    ...buildTransactionDateWhere({ startDate, endDate }),
  };

  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  if (search) {
    where.OR = [
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
      {
        note: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
};

const buildPurchaseExportWhere = ({
  startDate,
  endDate,
  paymentStatus,
  paymentMethod,
  status,
  search,
} = {}) => {
  const where = {
    status: status || "COMPLETED",
    ...buildTransactionDateWhere({ startDate, endDate }),
  };

  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  if (search) {
    where.OR = [
      {
        purchaseNumber: {
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
      {
        supplier: {
          phone: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        note: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
};

const getSaleItemSubtotalAmount = (sale) => {
  return sale.items.reduce((total, item) => total + item.subtotal, 0);
};

const getSaleAdditionalCostAmount = (sale) => {
  return sale.additionalCosts.reduce((total, cost) => total + cost.amount, 0);
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

const exportSalesReportExcel = async ({
  startDate,
  endDate,
  paymentStatus,
  paymentMethod,
  status,
  search,
} = {}) => {
  const storeProfile = await settingsService.getStoreProfile();

  const sales = await prisma.sale.findMany({
    where: buildSalesExportWhere({
      startDate,
      endDate,
      paymentStatus,
      paymentMethod,
      status,
      search,
    }),
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
      additionalCosts: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const workbook = new ExcelJS.Workbook();

  workbook.creator = storeProfile.name || "Glam Home Decor";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Laporan Penjualan");

  worksheet.mergeCells("A1:S1");
  worksheet.getCell("A1").value = storeProfile.name || "Glam Home Decor";
  worksheet.getCell("A1").font = {
    bold: true,
    size: 16,
  };
  worksheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  worksheet.mergeCells("A2:S2");
  worksheet.getCell("A2").value = "LAPORAN PENJUALAN";
  worksheet.getCell("A2").font = {
    bold: true,
    size: 14,
  };
  worksheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  worksheet.mergeCells("A3:S3");
  worksheet.getCell("A3").value = `Periode: ${getReportPeriodLabel({
    startDate,
    endDate,
  })}`;
  worksheet.getCell("A3").alignment = {
    horizontal: "center",
  };

  worksheet.addRow([]);

const salesReportColumns = [
  {
    label: "No",
    key: "no",
    width: 6,
  },
  {
    label: "Tanggal",
    key: "createdAt",
    width: 16,
  },
  {
    label: "No Penjualan",
    key: "saleNumber",
    width: 26,
  },
  {
    label: "No Invoice",
    key: "invoiceNumber",
    width: 28,
  },
  {
    label: "Customer",
    key: "customerName",
    width: 24,
  },
  {
    label: "No HP",
    key: "customerPhone",
    width: 18,
  },
  {
    label: "Status Penjualan",
    key: "status",
    width: 18,
  },
  {
    label: "Status Pembayaran",
    key: "paymentStatus",
    width: 20,
  },
  {
    label: "Metode Bayar",
    key: "paymentMethod",
    width: 16,
  },
  {
    label: "Subtotal Barang",
    key: "itemSubtotalAmount",
    width: 18,
  },
  {
    label: "Diskon",
    key: "discountAmount",
    width: 14,
  },
  {
    label: "Pajak",
    key: "taxAmount",
    width: 14,
  },
  {
    label: "Biaya Tambahan",
    key: "additionalCostAmount",
    width: 18,
  },
  {
    label: "Total",
    key: "totalAmount",
    width: 16,
  },
  {
    label: "Dibayar",
    key: "paidAmount",
    width: 16,
  },
  {
    label: "Sisa",
    key: "remainingAmount",
    width: 16,
  },
  {
    label: "Kas/Bank",
    key: "cashBankAccountName",
    width: 24,
  },
  {
    label: "Dibuat Oleh",
    key: "createdByName",
    width: 20,
  },
  {
    label: "Catatan",
    key: "note",
    width: 32,
  },
];

worksheet.columns = salesReportColumns.map((column) => ({
  key: column.key,
  width: column.width,
}));

const headerRow = worksheet.getRow(5);
headerRow.values = salesReportColumns.map((column) => column.label);
headerRow.height = 22;

salesReportColumns.forEach((column, index) => {
  const cell = headerRow.getCell(index + 1);

  cell.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF1F4E78",
    },
  };

  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  cell.border = {
    top: {
      style: "thin",
    },
    left: {
      style: "thin",
    },
    bottom: {
      style: "thin",
    },
    right: {
      style: "thin",
    },
  };
});

  let totalItemSubtotalAmount = 0;
  let totalDiscountAmount = 0;
  let totalTaxAmount = 0;
  let totalAdditionalCostAmount = 0;
  let totalAmount = 0;
  let totalPaidAmount = 0;
  let totalRemainingAmount = 0;

  sales.forEach((sale, index) => {
    const itemSubtotalAmount = getSaleItemSubtotalAmount(sale);
    const additionalCostAmount = getSaleAdditionalCostAmount(sale);

    totalItemSubtotalAmount += itemSubtotalAmount;
    totalDiscountAmount += sale.discountAmount;
    totalTaxAmount += sale.taxAmount;
    totalAdditionalCostAmount += additionalCostAmount;
    totalAmount += sale.totalAmount;
    totalPaidAmount += sale.paidAmount;
    totalRemainingAmount += sale.remainingAmount;

    worksheet.addRow({
      no: index + 1,
      createdAt: formatDateForExcelCell(sale.createdAt),
      saleNumber: sale.saleNumber,
      invoiceNumber: sale.invoiceNumber || "-",
      customerName: sale.customer ? sale.customer.name : sale.customerName || "-",
      customerPhone: sale.customer
        ? sale.customer.phone || "-"
        : sale.customerPhone || "-",
      status: sale.status,
      paymentStatus: sale.paymentStatus,
      paymentMethod: sale.paymentMethod,
      itemSubtotalAmount,
      discountAmount: sale.discountAmount,
      taxAmount: sale.taxAmount,
      additionalCostAmount,
      totalAmount: sale.totalAmount,
      paidAmount: sale.paidAmount,
      remainingAmount: sale.remainingAmount,
      cashBankAccountName: sale.cashBankAccount
        ? sale.cashBankAccount.name
        : "-",
      createdByName: sale.createdBy ? sale.createdBy.name : "-",
      note: sale.note || "-",
    });
  });

  const totalRow = worksheet.addRow({
    no: "",
    createdAt: "",
    saleNumber: "",
    invoiceNumber: "",
    customerName: "",
    customerPhone: "",
    status: "",
    paymentStatus: "",
    paymentMethod: "TOTAL",
    itemSubtotalAmount: totalItemSubtotalAmount,
    discountAmount: totalDiscountAmount,
    taxAmount: totalTaxAmount,
    additionalCostAmount: totalAdditionalCostAmount,
    totalAmount,
    paidAmount: totalPaidAmount,
    remainingAmount: totalRemainingAmount,
    cashBankAccountName: "",
    createdByName: "",
    note: "",
  });

  totalRow.font = {
    bold: true,
  };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 5) {
      row.eachCell((cell) => {
        cell.border = {
          top: {
            style: "thin",
          },
          left: {
            style: "thin",
          },
          bottom: {
            style: "thin",
          },
          right: {
            style: "thin",
          },
        };

        cell.alignment = {
          vertical: "middle",
          wrapText: true,
        };
      });
    }
  });

  const moneyColumns = [
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
  ];

  moneyColumns.forEach((column) => {
    worksheet.getColumn(column).numFmt = '"Rp." #,##0';
  });

  worksheet.getColumn("B").numFmt = "dd mmmm yyyy";

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 5,
    },
  ];

  worksheet.autoFilter = {
    from: "A5",
    to: "S5",
  };

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer,
    fileName: `laporan-penjualan-${formatDateForExcelFileName()}.xlsx`,
  };
};

const exportSalesReportPdf = async ({
  startDate,
  endDate,
  paymentStatus,
  paymentMethod,
  status,
  search,
} = {}) => {
  const storeProfile = await settingsService.getStoreProfile();

  const sales = await prisma.sale.findMany({
    where: buildSalesExportWhere({
      startDate,
      endDate,
      paymentStatus,
      paymentMethod,
      status,
      search,
    }),
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
      additionalCosts: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const summary = {
    saleCount: sales.length,
    totalAmount: 0,
    totalPaidAmount: 0,
    totalRemainingAmount: 0,
  };

  for (const sale of sales) {
    summary.totalAmount += sale.totalAmount;
    summary.totalPaidAmount += sale.paidAmount;
    summary.totalRemainingAmount += sale.remainingAmount;
  }

  const periodLabel = getReportPeriodLabel({
    startDate,
    endDate,
  });

  const buffer = await generateSalesReportPdfBuffer({
    storeProfile,
    sales,
    summary,
    periodLabel,
  });

  return {
    buffer,
    fileName: `laporan-penjualan-${formatDateForExcelFileName()}.pdf`,
  };
};

const exportPurchaseReportExcel = async ({
  startDate,
  endDate,
  paymentStatus,
  paymentMethod,
  status,
  search,
} = {}) => {
  const storeProfile = await settingsService.getStoreProfile();

  const purchases = await prisma.purchase.findMany({
    where: buildPurchaseExportWhere({
      startDate,
      endDate,
      paymentStatus,
      paymentMethod,
      status,
      search,
    }),
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
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const workbook = new ExcelJS.Workbook();

  workbook.creator = storeProfile.name || "Glam Home Decor";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Laporan Pembelian");

  worksheet.mergeCells("A1:N1");
  worksheet.getCell("A1").value = storeProfile.name || "Glam Home Decor";
  worksheet.getCell("A1").font = {
    bold: true,
    size: 16,
  };
  worksheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  worksheet.mergeCells("A2:N2");
  worksheet.getCell("A2").value = "LAPORAN PEMBELIAN";
  worksheet.getCell("A2").font = {
    bold: true,
    size: 14,
  };
  worksheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  worksheet.mergeCells("A3:N3");
  worksheet.getCell("A3").value = `Periode: ${getReportPeriodLabel({
    startDate,
    endDate,
  })}`;
  worksheet.getCell("A3").alignment = {
    horizontal: "center",
  };

  worksheet.addRow([]);

  const purchaseReportColumns = [
    {
      label: "No",
      key: "no",
      width: 6,
    },
    {
      label: "Tanggal",
      key: "createdAt",
      width: 16,
    },
    {
      label: "No Pembelian",
      key: "purchaseNumber",
      width: 26,
    },
    {
      label: "Supplier",
      key: "supplierName",
      width: 24,
    },
    {
      label: "No HP Supplier",
      key: "supplierPhone",
      width: 18,
    },
    {
      label: "Status Pembelian",
      key: "status",
      width: 18,
    },
    {
      label: "Status Pembayaran",
      key: "paymentStatus",
      width: 20,
    },
    {
      label: "Metode Bayar",
      key: "paymentMethod",
      width: 16,
    },
    {
      label: "Total",
      key: "totalAmount",
      width: 16,
    },
    {
      label: "Dibayar",
      key: "paidAmount",
      width: 16,
    },
    {
      label: "Sisa",
      key: "remainingAmount",
      width: 16,
    },
    {
      label: "Kas/Bank",
      key: "cashBankAccountName",
      width: 24,
    },
    {
      label: "Dibuat Oleh",
      key: "createdByName",
      width: 20,
    },
    {
      label: "Catatan",
      key: "note",
      width: 22,
    },
  ];

  worksheet.columns = purchaseReportColumns.map((column) => ({
    key: column.key,
    width: column.width,
  }));

  const headerRow = worksheet.getRow(5);
  headerRow.values = purchaseReportColumns.map((column) => column.label);
  headerRow.height = 22;

  purchaseReportColumns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);

    cell.font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF1F4E78",
      },
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    cell.border = {
      top: {
        style: "thin",
      },
      left: {
        style: "thin",
      },
      bottom: {
        style: "thin",
      },
      right: {
        style: "thin",
      },
    };
  });

  let totalAmount = 0;
  let totalPaidAmount = 0;
  let totalRemainingAmount = 0;

  purchases.forEach((purchase, index) => {
    totalAmount += purchase.totalAmount;
    totalPaidAmount += purchase.paidAmount;
    totalRemainingAmount += purchase.remainingAmount;

    worksheet.addRow({
      no: index + 1,
      createdAt: formatDateForExcelCell(purchase.createdAt),
      purchaseNumber: purchase.purchaseNumber,
      supplierName: purchase.supplier ? purchase.supplier.name : "-",
      supplierPhone: purchase.supplier ? purchase.supplier.phone || "-" : "-",
      status: purchase.status,
      paymentStatus: purchase.paymentStatus,
      paymentMethod: purchase.paymentMethod,
      totalAmount: purchase.totalAmount,
      paidAmount: purchase.paidAmount,
      remainingAmount: purchase.remainingAmount,
      cashBankAccountName: purchase.cashBankAccount
        ? purchase.cashBankAccount.name
        : "-",
      createdByName: purchase.createdBy ? purchase.createdBy.name : "-",
      note: purchase.note || "-",
    });
  });

  const totalRow = worksheet.addRow({
    no: "",
    createdAt: "",
    purchaseNumber: "",
    supplierName: "",
    supplierPhone: "",
    status: "",
    paymentStatus: "",
    paymentMethod: "TOTAL",
    totalAmount,
    paidAmount: totalPaidAmount,
    remainingAmount: totalRemainingAmount,
    cashBankAccountName: "",
    createdByName: "",
    note: "",
  });

  totalRow.font = {
    bold: true,
  };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 5) {
      row.eachCell((cell) => {
        cell.border = {
          top: {
            style: "thin",
          },
          left: {
            style: "thin",
          },
          bottom: {
            style: "thin",
          },
          right: {
            style: "thin",
          },
        };

        cell.alignment = {
          vertical: "middle",
          wrapText: true,
        };
      });
    }
  });

  const moneyColumns = ["I", "J", "K"];

  moneyColumns.forEach((column) => {
    worksheet.getColumn(column).numFmt = '"Rp." #,##0';
  });

  worksheet.getColumn("B").numFmt = "dd mmmm yyyy";

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 5,
    },
  ];

  worksheet.autoFilter = {
    from: "A5",
    to: "N5",
  };

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer,
    fileName: `laporan-pembelian-${formatDateForExcelFileName()}.xlsx`,
  };
};

const exportPurchaseReportPdf = async ({
  startDate,
  endDate,
  paymentStatus,
  paymentMethod,
  status,
  search,
} = {}) => {
  const storeProfile = await settingsService.getStoreProfile();

  const purchases = await prisma.purchase.findMany({
    where: buildPurchaseExportWhere({
      startDate,
      endDate,
      paymentStatus,
      paymentMethod,
      status,
      search,
    }),
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
    totalAmount: 0,
    totalPaidAmount: 0,
    totalRemainingAmount: 0,
  };

  for (const purchase of purchases) {
    summary.totalAmount += purchase.totalAmount;
    summary.totalPaidAmount += purchase.paidAmount;
    summary.totalRemainingAmount += purchase.remainingAmount;
  }

  const periodLabel = getReportPeriodLabel({
    startDate,
    endDate,
  });

  const buffer = await generatePurchaseReportPdfBuffer({
    storeProfile,
    purchases,
    summary,
    periodLabel,
  });

  return {
    buffer,
    fileName: `laporan-pembelian-${formatDateForExcelFileName()}.pdf`,
  };
};

const buildStockExportWhere = ({ categoryId, status, search } = {}) => {
  const where = {};

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      {
        supplierCode: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        searchCode: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        category: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  return where;
};

const getStockStatus = (product) => {
  if (product.stock <= 0) {
    return "HABIS";
  }

  if (product.stock <= product.minStock) {
    return "STOK MENIPIS";
  }

  return "AMAN";
};

const filterProductsByStockStatus = (products, stockStatus) => {
  if (!stockStatus) {
    return products;
  }

  return products.filter((product) => {
    const currentStockStatus = getStockStatus(product);

    if (stockStatus === "OUT_OF_STOCK") {
      return currentStockStatus === "HABIS";
    }

    if (stockStatus === "LOW_STOCK") {
      return currentStockStatus === "STOK MENIPIS";
    }

    if (stockStatus === "SAFE") {
      return currentStockStatus === "AMAN";
    }

    return true;
  });
};

const exportStockReportExcel = async ({
  categoryId,
  status,
  stockStatus,
  search,
} = {}) => {
  const storeProfile = await settingsService.getStoreProfile();

  const productsData = await prisma.product.findMany({
    where: buildStockExportWhere({
      categoryId,
      status,
      search,
    }),
    include: {
      category: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const products = filterProductsByStockStatus(productsData, stockStatus);

  const workbook = new ExcelJS.Workbook();

  workbook.creator = storeProfile.name || "Glam Home Decor";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Laporan Stok");

  worksheet.mergeCells("A1:M1");
  worksheet.getCell("A1").value = storeProfile.name || "Glam Home Decor";
  worksheet.getCell("A1").font = {
    bold: true,
    size: 16,
  };
  worksheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  worksheet.mergeCells("A2:M2");
  worksheet.getCell("A2").value = "LAPORAN STOK BARANG";
  worksheet.getCell("A2").font = {
    bold: true,
    size: 14,
  };
  worksheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  worksheet.mergeCells("A3:M3");
  worksheet.getCell("A3").value = `Filter: ${
    stockStatus || status || categoryId || search ? "Sesuai parameter" : "Semua Barang"
  }`;
  worksheet.getCell("A3").alignment = {
    horizontal: "center",
  };

  worksheet.addRow([]);

  const stockReportColumns = [
    {
      label: "No",
      key: "no",
      width: 6,
    },
    {
      label: "Kode Supplier",
      key: "supplierCode",
      width: 18,
    },
    {
      label: "Kode Cari",
      key: "searchCode",
      width: 16,
    },
    {
      label: "Nama Barang",
      key: "name",
      width: 28,
    },
    {
      label: "Kategori",
      key: "categoryName",
      width: 18,
    },
    {
      label: "Unit",
      key: "unit",
      width: 12,
    },
    {
      label: "Stok",
      key: "stock",
      width: 10,
    },
    {
      label: "Min Stok",
      key: "minStock",
      width: 12,
    },
    {
      label: "Status Stok",
      key: "stockStatus",
      width: 16,
    },
    {
      label: "Harga Beli",
      key: "purchasePrice",
      width: 16,
    },
    {
      label: "Harga Jual",
      key: "sellingPrice",
      width: 16,
    },
    {
      label: "Nilai Stok",
      key: "stockValue",
      width: 18,
    },
    {
      label: "Status Barang",
      key: "status",
      width: 16,
    },
  ];

  worksheet.columns = stockReportColumns.map((column) => ({
    key: column.key,
    width: column.width,
  }));

  const headerRow = worksheet.getRow(5);
  headerRow.values = stockReportColumns.map((column) => column.label);
  headerRow.height = 22;

  stockReportColumns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);

    cell.font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF1F4E78",
      },
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    cell.border = {
      top: {
        style: "thin",
      },
      left: {
        style: "thin",
      },
      bottom: {
        style: "thin",
      },
      right: {
        style: "thin",
      },
    };
  });

  let totalStock = 0;
  let totalStockValue = 0;
  let safeStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  products.forEach((product, index) => {
    const currentStockStatus = getStockStatus(product);
    const stockValue = product.stock * product.purchasePrice;

    totalStock += product.stock;
    totalStockValue += stockValue;

    if (currentStockStatus === "AMAN") {
      safeStockCount += 1;
    }

    if (currentStockStatus === "STOK MENIPIS") {
      lowStockCount += 1;
    }

    if (currentStockStatus === "HABIS") {
      outOfStockCount += 1;
    }

    worksheet.addRow({
      no: index + 1,
      supplierCode: product.supplierCode,
      searchCode: product.searchCode,
      name: product.name,
      categoryName: product.category ? product.category.name : "-",
      unit: product.unit,
      stock: product.stock,
      minStock: product.minStock,
      stockStatus: currentStockStatus,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      stockValue,
      status: product.status,
    });
  });

  const totalRow = worksheet.addRow({
    no: "",
    supplierCode: "",
    searchCode: "",
    name: "",
    categoryName: "",
    unit: "TOTAL",
    stock: totalStock,
    minStock: "",
    stockStatus: `AMAN: ${safeStockCount}, MENIPIS: ${lowStockCount}, HABIS: ${outOfStockCount}`,
    purchasePrice: "",
    sellingPrice: "",
    stockValue: totalStockValue,
    status: "",
  });

  totalRow.font = {
    bold: true,
  };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 5) {
      row.eachCell((cell) => {
        cell.border = {
          top: {
            style: "thin",
          },
          left: {
            style: "thin",
          },
          bottom: {
            style: "thin",
          },
          right: {
            style: "thin",
          },
        };

        cell.alignment = {
          vertical: "middle",
          wrapText: true,
        };
      });
    }
  });

  const moneyColumns = ["J", "K", "L"];

  moneyColumns.forEach((column) => {
    worksheet.getColumn(column).numFmt = '"Rp." #,##0';
  });

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 5,
    },
  ];

  worksheet.autoFilter = {
    from: "A5",
    to: "M5",
  };

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer,
    fileName: `laporan-stok-${formatDateForExcelFileName()}.xlsx`,
  };
};

const getStockFilterLabel = ({ categoryId, status, stockStatus, search } = {}) => {
  const filters = [];

  if (categoryId) {
    filters.push("Kategori tertentu");
  }

  if (status) {
    filters.push(`Status barang ${status}`);
  }

  if (stockStatus) {
    filters.push(`Status stok ${stockStatus}`);
  }

  if (search) {
    filters.push(`Pencarian "${search}"`);
  }

  return filters.length > 0 ? filters.join(", ") : "Semua Barang";
};

const exportStockReportPdf = async ({
  categoryId,
  status,
  stockStatus,
  search,
} = {}) => {
  const storeProfile = await settingsService.getStoreProfile();

  const productsData = await prisma.product.findMany({
    where: buildStockExportWhere({
      categoryId,
      status,
      search,
    }),
    include: {
      category: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const filteredProducts = filterProductsByStockStatus(productsData, stockStatus);

  const products = filteredProducts.map((product) => {
    const stockStatusLabel = getStockStatus(product);
    const stockValue = product.stock * product.purchasePrice;

    return {
      id: product.id,
      supplierCode: product.supplierCode,
      searchCode: product.searchCode,
      name: product.name,
      categoryName: product.category ? product.category.name : "-",
      unit: product.unit,
      stock: product.stock,
      minStock: product.minStock,
      stockStatus: stockStatusLabel,
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      stockValue,
      status: product.status,
    };
  });

  const summary = {
    productCount: products.length,
    totalStock: 0,
    totalStockValue: 0,
    safeStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  };

  products.forEach((product) => {
    summary.totalStock += product.stock;
    summary.totalStockValue += product.stockValue;

    if (product.stockStatus === "AMAN") {
      summary.safeStockCount += 1;
    }

    if (product.stockStatus === "STOK MENIPIS") {
      summary.lowStockCount += 1;
    }

    if (product.stockStatus === "HABIS") {
      summary.outOfStockCount += 1;
    }
  });

  const buffer = await generateStockReportPdfBuffer({
    storeProfile,
    products,
    summary,
    filterLabel: getStockFilterLabel({
      categoryId,
      status,
      stockStatus,
      search,
    }),
  });

  return {
    buffer,
    fileName: `laporan-stok-${formatDateForExcelFileName()}.pdf`,
  };
};

const getMonthName = (month) => {
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return monthNames[month - 1] || "-";
};

const getPayrollPeriodLabel = (payroll) => {
  return `${getMonthName(payroll.periodMonth)} ${payroll.periodYear}`;
};

const buildPayrollExportWhere = ({
  employeeId,
  periodMonth,
  periodYear,
  paymentMethod,
  status,
  startDate,
  endDate,
  search,
} = {}) => {
  const where = {};

  if (employeeId) {
    where.employeeId = employeeId;
  }

  if (periodMonth) {
    where.periodMonth = Number(periodMonth);
  }

  if (periodYear) {
    where.periodYear = Number(periodYear);
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.paidAt = {};

    if (startDate) {
      where.paidAt.gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.paidAt.lte = end;
    }
  }

  if (search) {
    where.OR = [
      {
        payrollNumber: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        note: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        employee: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        employee: {
          position: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        employee: {
          phone: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  return where;
};

const exportPayrollReportExcel = async ({
  employeeId,
  periodMonth,
  periodYear,
  paymentMethod,
  status,
  startDate,
  endDate,
  search,
} = {}) => {
  const storeProfile = await settingsService.getStoreProfile();

  const payrolls = await prisma.payroll.findMany({
    where: buildPayrollExportWhere({
      employeeId,
      periodMonth,
      periodYear,
      paymentMethod,
      status,
      startDate,
      endDate,
      search,
    }),
    include: {
      employee: true,
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
      paidAt: "desc",
    },
  });

  const workbook = new ExcelJS.Workbook();

  workbook.creator = storeProfile.name || "Glam Home Decor";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Laporan Payroll");

  worksheet.mergeCells("A1:P1");
  worksheet.getCell("A1").value = storeProfile.name || "Glam Home Decor";
  worksheet.getCell("A1").font = {
    bold: true,
    size: 16,
  };
  worksheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  worksheet.mergeCells("A2:P2");
  worksheet.getCell("A2").value = "LAPORAN PAYROLL";
  worksheet.getCell("A2").font = {
    bold: true,
    size: 14,
  };
  worksheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  worksheet.mergeCells("A3:P3");
  worksheet.getCell("A3").value = `Periode: ${getReportPeriodLabel({
    startDate,
    endDate,
  })}`;
  worksheet.getCell("A3").alignment = {
    horizontal: "center",
  };

  worksheet.addRow([]);

  const payrollReportColumns = [
    {
      label: "No",
      key: "no",
      width: 6,
    },
    {
      label: "Tanggal Bayar",
      key: "paidAt",
      width: 16,
    },
    {
      label: "No Payroll",
      key: "payrollNumber",
      width: 26,
    },
    {
      label: "Periode",
      key: "periodLabel",
      width: 16,
    },
    {
      label: "Nama Karyawan",
      key: "employeeName",
      width: 24,
    },
    {
      label: "Jabatan",
      key: "position",
      width: 22,
    },
    {
      label: "Gaji Pokok",
      key: "baseSalary",
      width: 16,
    },
    {
      label: "Tunjangan",
      key: "allowance",
      width: 16,
    },
    {
      label: "Bonus",
      key: "bonus",
      width: 16,
    },
    {
      label: "Potongan",
      key: "deduction",
      width: 16,
    },
    {
      label: "Gaji Kotor",
      key: "grossSalary",
      width: 16,
    },
    {
      label: "Gaji Bersih",
      key: "netSalary",
      width: 16,
    },
    {
      label: "Metode Bayar",
      key: "paymentMethod",
      width: 16,
    },
    {
      label: "Kas/Bank",
      key: "cashBankAccountName",
      width: 24,
    },
    {
      label: "Dibuat Oleh",
      key: "createdByName",
      width: 20,
    },
    {
      label: "Catatan",
      key: "note",
      width: 22,
    },
  ];

  worksheet.columns = payrollReportColumns.map((column) => ({
    key: column.key,
    width: column.width,
  }));

  const headerRow = worksheet.getRow(5);
  headerRow.values = payrollReportColumns.map((column) => column.label);
  headerRow.height = 22;

  payrollReportColumns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);

    cell.font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF1F4E78",
      },
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    cell.border = {
      top: {
        style: "thin",
      },
      left: {
        style: "thin",
      },
      bottom: {
        style: "thin",
      },
      right: {
        style: "thin",
      },
    };
  });

  let totalBaseSalary = 0;
  let totalAllowance = 0;
  let totalBonus = 0;
  let totalDeduction = 0;
  let totalGrossSalary = 0;
  let totalNetSalary = 0;

  payrolls.forEach((payroll, index) => {
    totalBaseSalary += payroll.baseSalary;
    totalAllowance += payroll.allowance;
    totalBonus += payroll.bonus;
    totalDeduction += payroll.deduction;
    totalGrossSalary += payroll.grossSalary;
    totalNetSalary += payroll.netSalary;

    worksheet.addRow({
      no: index + 1,
      paidAt: formatDateForExcelCell(payroll.paidAt),
      payrollNumber: payroll.payrollNumber,
      periodLabel: getPayrollPeriodLabel(payroll),
      employeeName: payroll.employee ? payroll.employee.name : "-",
      position: payroll.employee ? payroll.employee.position : "-",
      baseSalary: payroll.baseSalary,
      allowance: payroll.allowance,
      bonus: payroll.bonus,
      deduction: payroll.deduction,
      grossSalary: payroll.grossSalary,
      netSalary: payroll.netSalary,
      paymentMethod: payroll.paymentMethod,
      cashBankAccountName: payroll.cashBankAccount
        ? payroll.cashBankAccount.name
        : "-",
      createdByName: payroll.createdBy ? payroll.createdBy.name : "-",
      note: payroll.note || "-",
    });
  });

  const totalRow = worksheet.addRow({
    no: "",
    paidAt: "",
    payrollNumber: "",
    periodLabel: "",
    employeeName: "",
    position: "TOTAL",
    baseSalary: totalBaseSalary,
    allowance: totalAllowance,
    bonus: totalBonus,
    deduction: totalDeduction,
    grossSalary: totalGrossSalary,
    netSalary: totalNetSalary,
    paymentMethod: "",
    cashBankAccountName: "",
    createdByName: "",
    note: "",
  });

  totalRow.font = {
    bold: true,
  };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 5) {
      row.eachCell((cell) => {
        cell.border = {
          top: {
            style: "thin",
          },
          left: {
            style: "thin",
          },
          bottom: {
            style: "thin",
          },
          right: {
            style: "thin",
          },
        };

        cell.alignment = {
          vertical: "middle",
          wrapText: true,
        };
      });
    }
  });

  const moneyColumns = ["G", "H", "I", "J", "K", "L"];

  moneyColumns.forEach((column) => {
    worksheet.getColumn(column).numFmt = '"Rp." #,##0';
  });

  worksheet.getColumn("B").numFmt = "dd mmmm yyyy";

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 5,
    },
  ];

  worksheet.autoFilter = {
    from: "A5",
    to: "P5",
  };

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer,
    fileName: `laporan-payroll-${formatDateForExcelFileName()}.xlsx`,
  };
};

const getPayrollReportPeriodLabel = ({
  periodMonth,
  periodYear,
  startDate,
  endDate,
} = {}) => {
  if (periodMonth && periodYear) {
    return `${getMonthName(Number(periodMonth))} ${periodYear}`;
  }

  if (periodYear) {
    return `Tahun ${periodYear}`;
  }

  return getReportPeriodLabel({
    startDate,
    endDate,
  });
};

const exportPayrollReportPdf = async ({
  employeeId,
  periodMonth,
  periodYear,
  paymentMethod,
  status,
  startDate,
  endDate,
  search,
} = {}) => {
  const storeProfile = await settingsService.getStoreProfile();

  const payrollData = await prisma.payroll.findMany({
    where: buildPayrollExportWhere({
      employeeId,
      periodMonth,
      periodYear,
      paymentMethod,
      status,
      startDate,
      endDate,
      search,
    }),
    include: {
      employee: true,
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
      paidAt: "desc",
    },
  });

  const summary = {
    payrollCount: payrollData.length,
    totalBaseSalary: 0,
    totalAllowance: 0,
    totalBonus: 0,
    totalDeduction: 0,
    totalGrossSalary: 0,
    totalNetSalary: 0,
  };

  const payrolls = payrollData.map((payroll) => {
    summary.totalBaseSalary += payroll.baseSalary;
    summary.totalAllowance += payroll.allowance;
    summary.totalBonus += payroll.bonus;
    summary.totalDeduction += payroll.deduction;
    summary.totalGrossSalary += payroll.grossSalary;
    summary.totalNetSalary += payroll.netSalary;

    return {
      id: payroll.id,
      payrollNumber: payroll.payrollNumber,
      paidAt: payroll.paidAt,
      periodLabel: getPayrollPeriodLabel(payroll),
      employeeName: payroll.employee ? payroll.employee.name : "-",
      position: payroll.employee ? payroll.employee.position : "-",
      baseSalary: payroll.baseSalary,
      allowance: payroll.allowance,
      bonus: payroll.bonus,
      deduction: payroll.deduction,
      grossSalary: payroll.grossSalary,
      netSalary: payroll.netSalary,
      paymentMethod: payroll.paymentMethod,
      status: payroll.status,
    };
  });

  const buffer = await generatePayrollReportPdfBuffer({
    storeProfile,
    payrolls,
    summary,
    periodLabel: getPayrollReportPeriodLabel({
      periodMonth,
      periodYear,
      startDate,
      endDate,
    }),
  });

  return {
    buffer,
    fileName: `laporan-payroll-${formatDateForExcelFileName()}.pdf`,
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
  exportSalesReportExcel,
  exportSalesReportPdf,
  exportPurchaseReportExcel,
  exportPurchaseReportPdf,
  exportStockReportExcel,
  exportStockReportPdf,
  exportPayrollReportExcel,
  exportPayrollReportPdf,
};