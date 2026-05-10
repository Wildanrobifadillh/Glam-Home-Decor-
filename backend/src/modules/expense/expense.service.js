const prisma = require("../../config/prisma");
const { generateExpenseNumber } = require("../../utils/generateExpenseNumber");
const {
  createJournalEntryWithLines,
  getCashBankAccountForPayment,
} = require("../../utils/accountingJournal");

const getExpenseInclude = () => ({
  account: true,
  cashBankAccount: {
    include: {
      account: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
    },
  },
});

const buildExpenseWhere = ({
  accountId,
  cashBankAccountId,
  paymentMethod,
  status,
  startDate,
  endDate,
  search,
} = {}) => {
  const where = {};

  if (accountId) {
    where.accountId = accountId;
  }

  if (cashBankAccountId) {
    where.cashBankAccountId = cashBankAccountId;
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod;
  }

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.expenseDate = {};

    if (startDate) {
      where.expenseDate.gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.expenseDate.lte = end;
    }
  }

  if (search) {
    where.OR = [
      {
        expenseNumber: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
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
        account: {
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

const getAllExpenses = async (filters = {}) => {
  return prisma.expense.findMany({
    where: buildExpenseWhere(filters),
    include: getExpenseInclude(),
    orderBy: {
      expenseDate: "desc",
    },
  });
};

const getExpenseById = async (id) => {
  const expense = await prisma.expense.findUnique({
    where: {
      id,
    },
    include: getExpenseInclude(),
  });

  if (!expense) {
    const error = new Error("Expense not found");
    error.status = 404;
    throw error;
  }

  return expense;
};

const getExpenseSummary = async ({ startDate, endDate } = {}) => {
  const expenses = await prisma.expense.findMany({
    where: buildExpenseWhere({
      status: "POSTED",
      startDate,
      endDate,
    }),
    include: {
      account: true,
      cashBankAccount: true,
    },
  });

  const summary = {
    expenseCount: expenses.length,
    totalAmount: 0,
    byAccount: [],
    byCashBankAccount: [],
    byPaymentMethod: {
      CASH: 0,
      TRANSFER: 0,
    },
  };

  const accountMap = new Map();
  const cashBankMap = new Map();

  for (const expense of expenses) {
    summary.totalAmount += expense.amount;
    summary.byPaymentMethod[expense.paymentMethod] += expense.amount;

    if (!accountMap.has(expense.accountId)) {
      accountMap.set(expense.accountId, {
        accountId: expense.accountId,
        accountCode: expense.account.code,
        accountName: expense.account.name,
        amount: 0,
        count: 0,
      });
    }

    const accountSummary = accountMap.get(expense.accountId);
    accountSummary.amount += expense.amount;
    accountSummary.count += 1;

    if (!cashBankMap.has(expense.cashBankAccountId)) {
      cashBankMap.set(expense.cashBankAccountId, {
        cashBankAccountId: expense.cashBankAccountId,
        cashBankAccountName: expense.cashBankAccount.name,
        type: expense.cashBankAccount.type,
        amount: 0,
        count: 0,
      });
    }

    const cashBankSummary = cashBankMap.get(expense.cashBankAccountId);
    cashBankSummary.amount += expense.amount;
    cashBankSummary.count += 1;
  }

  summary.byAccount = Array.from(accountMap.values()).sort(
    (a, b) => b.amount - a.amount
  );

  summary.byCashBankAccount = Array.from(cashBankMap.values()).sort(
    (a, b) => b.amount - a.amount
  );

  return summary;
};

const createExpenseJournal = async ({
  tx,
  expense,
  expenseAccount,
  cashBankAccount,
  createdById,
}) => {
  await createJournalEntryWithLines({
    tx,
    description: `Jurnal expense ${expense.expenseNumber}`,
    sourceType: "EXPENSE",
    sourceId: expense.id,
    lines: [
      {
        accountId: expenseAccount.id,
        debit: expense.amount,
        credit: 0,
        note: expense.description,
      },
      {
        accountId: cashBankAccount.accountId,
        debit: 0,
        credit: expense.amount,
        note: `Pembayaran expense ${expense.expenseNumber}`,
      },
    ],
    createdById,
  });
};

const createExpense = async ({
  expenseDate,
  accountId,
  cashBankAccountId,
  amount,
  paymentMethod,
  description,
  note,
  createdById,
}) => {
  return prisma.$transaction(async (tx) => {
    const expenseAccount = await tx.account.findUnique({
      where: {
        id: accountId,
      },
    });

    if (!expenseAccount) {
      const error = new Error("Expense account not found");
      error.status = 404;
      throw error;
    }

    if (expenseAccount.status !== "ACTIVE") {
      const error = new Error("Expense account is inactive");
      error.status = 400;
      throw error;
    }

    if (expenseAccount.type !== "EXPENSE") {
      const error = new Error("Account must be an expense account");
      error.status = 400;
      throw error;
    }

    const cashBankAccount = await getCashBankAccountForPayment(
      tx,
      cashBankAccountId,
      paymentMethod
    );

    const expenseNumber = generateExpenseNumber();

    const expense = await tx.expense.create({
      data: {
        expenseNumber,
        expenseDate: expenseDate || new Date(),
        accountId,
        cashBankAccountId,
        amount,
        paymentMethod,
        description,
        note,
        status: "POSTED",
        createdById,
      },
    });

    await createExpenseJournal({
      tx,
      expense,
      expenseAccount,
      cashBankAccount,
      createdById,
    });

    return tx.expense.findUnique({
      where: {
        id: expense.id,
      },
      include: getExpenseInclude(),
    });
  });
};

module.exports = {
  getAllExpenses,
  getExpenseById,
  getExpenseSummary,
  createExpense,
};