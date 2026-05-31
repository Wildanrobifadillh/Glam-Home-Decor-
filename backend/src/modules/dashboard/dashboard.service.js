const prisma = require("../../config/prisma");
const reportService = require("../report/report.service");

const getOwnerDashboard = async ({ periodType = "MONTH", date } = {}) => {
  const period = buildPeriod(periodType, date || new Date());

  const [ownerSummary, inventorySummary, trendData] = await Promise.all([
    reportService.getOwnerSummary({
      startDate: period.startDate,
      endDate: period.endDate,
    }),
    getInventorySummary(),
    getTrendData(period),
  ]);

  const summary = ownerSummary.summary || {};
  const profitLoss = ownerSummary.profitLoss || {};
  const cashBank = ownerSummary.cashBank || {};
  const receivables = ownerSummary.receivables || {};
  const payables = ownerSummary.payables || {};

  const totalRevenue = getNumber(summary.totalRevenue, profitLoss.totalRevenue);
  const netProfit = getNumber(summary.netProfit, profitLoss.netProfit);
  const cashBankBalance = getNumber(
    summary.totalCashBankBalance,
    cashBank.totalCurrentBalance
  );
  const receivableRemaining = getNumber(
    summary.totalReceivableRemaining,
    receivables.totalRemainingAmount
  );
  const payableRemaining = getNumber(
    summary.totalPayableRemaining,
    payables.totalRemainingAmount
  );

  return {
    period,
    kpi: {
      totalRevenue,
      netProfit,
      cashBankBalance,
      receivableRemaining,
      payableRemaining,
      inventoryWealthByHpp: inventorySummary.inventoryWealthByHpp,
    },
    profitLoss,
    cashBank,
    receivables,
    payables,
    inventory: inventorySummary,
    charts: {
      revenueProfitTrend: trendData.revenueProfitTrend,
      cashFlowTrend: trendData.cashFlowTrend,
      assetSnapshot: [
        {
          label: "Kas/Bank",
          value: cashBankBalance,
        },
        {
          label: "Piutang",
          value: receivableRemaining,
        },
        {
          label: "Kekayaan Barang",
          value: inventorySummary.inventoryWealthByHpp,
        },
      ],
      obligationSnapshot: [
        {
          label: "Hutang",
          value: payableRemaining,
        },
      ],
    },
    alerts: {
      lowStockProducts: inventorySummary.lowStockProducts,
    },
  };
};

const getInventorySummary = async () => {
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      id: true,
      supplierCode: true,
      searchCode: true,
      name: true,
      stock: true,
      minStock: true,
      purchasePrice: true,
      sellingPrice: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  let inventoryWealthByHpp = 0;
  let totalStockQty = 0;

  const lowStockProducts = [];

  for (const product of products) {
    const stock = getNumber(product.stock);
    const purchasePrice = getNumber(product.purchasePrice);
    const minStock = getNumber(product.minStock);

    inventoryWealthByHpp += stock * purchasePrice;
    totalStockQty += stock;

    if (minStock > 0 && stock <= minStock) {
      lowStockProducts.push({
        id: product.id,
        supplierCode: product.supplierCode,
        searchCode: product.searchCode,
        name: product.name,
        categoryName: product.category?.name || "-",
        stock,
        minStock,
        purchasePrice,
        inventoryValue: stock * purchasePrice,
      });
    }
  }

  lowStockProducts.sort((a, b) => a.stock - b.stock);

  return {
    totalProduct: products.length,
    totalStockQty,
    lowStockCount: lowStockProducts.length,
    inventoryWealthByHpp,
    lowStockProducts: lowStockProducts.slice(0, 10),
  };
};

const getTrendData = async (period) => {
  const buckets = buildBuckets(period);
  const bucketMap = new Map(
    buckets.map((bucket) => [
      bucket.key,
      {
        ...bucket,
        revenue: 0,
        cogs: 0,
        expense: 0,
        profit: 0,
        cashIn: 0,
        cashOut: 0,
        cashNet: 0,
      },
    ])
  );

  const cashBankAccounts = await prisma.cashBankAccount.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      accountId: true,
    },
  });

  const cashBankAccountIds = new Set(
    cashBankAccounts.map((account) => account.accountId)
  );

  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      status: "POSTED",
      entryDate: {
        gte: period.start,
        lte: period.end,
      },
    },
    include: {
      lines: {
        include: {
          account: true,
        },
      },
    },
    orderBy: {
      entryDate: "asc",
    },
  });

  for (const journalEntry of journalEntries) {
    const bucketKey = getBucketKey(journalEntry.entryDate, period.periodType);
    const bucket = bucketMap.get(bucketKey);

    if (!bucket) {
      continue;
    }

    for (const line of journalEntry.lines) {
      const debit = getNumber(line.debit);
      const credit = getNumber(line.credit);
      const accountType = line.account?.type;

      if (accountType === "REVENUE") {
        bucket.revenue += credit - debit;
      }

      if (accountType === "COGS") {
        bucket.cogs += debit - credit;
      }

      if (accountType === "EXPENSE") {
        bucket.expense += debit - credit;
      }

      if (cashBankAccountIds.has(line.accountId)) {
        bucket.cashIn += debit;
        bucket.cashOut += credit;
      }
    }
  }

  const values = Array.from(bucketMap.values()).map((bucket) => {
    const profit = bucket.revenue - bucket.cogs - bucket.expense;
    const cashNet = bucket.cashIn - bucket.cashOut;

    return {
      ...bucket,
      profit,
      cashNet,
    };
  });

  return {
    revenueProfitTrend: values.map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      revenue: bucket.revenue,
      cogs: bucket.cogs,
      expense: bucket.expense,
      profit: bucket.profit,
    })),
    cashFlowTrend: values.map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      cashIn: bucket.cashIn,
      cashOut: bucket.cashOut,
      cashNet: bucket.cashNet,
    })),
  };
};

const buildPeriod = (periodType, dateValue) => {
  const normalizedType = ["DAY", "MONTH", "YEAR"].includes(periodType)
    ? periodType
    : "MONTH";

  const date = new Date(dateValue);

  let start;
  let end;
  let label;

  if (normalizedType === "DAY") {
    start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    end = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    end.setHours(23, 59, 59, 999);

    label = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  if (normalizedType === "MONTH") {
    start = new Date(date.getFullYear(), date.getMonth(), 1);
    end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);

    label = new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(date);
  }

  if (normalizedType === "YEAR") {
    start = new Date(date.getFullYear(), 0, 1);
    end = new Date(date.getFullYear(), 11, 31);
    end.setHours(23, 59, 59, 999);

    label = String(date.getFullYear());
  }

  return {
    periodType: normalizedType,
    date: toDateInput(date),
    start,
    end,
    startDate: toDateInput(start),
    endDate: toDateInput(end),
    label,
  };
};

const buildBuckets = (period) => {
  if (period.periodType === "DAY") {
    return Array.from({ length: 24 }).map((_, hour) => {
      const key = String(hour).padStart(2, "0");

      return {
        key,
        label: `${key}:00`,
      };
    });
  }

  if (period.periodType === "MONTH") {
    const year = period.start.getFullYear();
    const month = period.start.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: totalDays }).map((_, index) => {
      const day = index + 1;
      const key = String(day).padStart(2, "0");

      return {
        key,
        label: key,
      };
    });
  }

  return Array.from({ length: 12 }).map((_, index) => {
    const month = index + 1;
    const key = String(month).padStart(2, "0");

    return {
      key,
      label: new Intl.DateTimeFormat("id-ID", {
        month: "short",
      }).format(new Date(period.start.getFullYear(), index, 1)),
    };
  });
};

const getBucketKey = (dateValue, periodType) => {
  const date = new Date(dateValue);

  if (periodType === "DAY") {
    return String(date.getHours()).padStart(2, "0");
  }

  if (periodType === "MONTH") {
    return String(date.getDate()).padStart(2, "0");
  }

  return String(date.getMonth() + 1).padStart(2, "0");
};

const toDateInput = (date) => {
  const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return adjustedDate.toISOString().slice(0, 10);
};

const getNumber = (...values) => {
  for (const value of values) {
    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return 0;
};

module.exports = {
  getOwnerDashboard,
};