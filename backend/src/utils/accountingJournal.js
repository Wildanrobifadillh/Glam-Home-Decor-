const {
  generateJournalEntryNumber,
} = require("./generateJournalEntryNumber");

const validateJournalAccounts = async (tx, lines) => {
  const accountIds = lines.map((line) => line.accountId);
  const uniqueAccountIds = [...new Set(accountIds)];

  const accounts = await tx.account.findMany({
    where: {
      id: {
        in: uniqueAccountIds,
      },
    },
  });

  if (accounts.length !== uniqueAccountIds.length) {
    const error = new Error("One or more accounts were not found");
    error.status = 404;
    throw error;
  }

  for (const account of accounts) {
    if (account.status !== "ACTIVE") {
      const error = new Error(`Account ${account.name} is inactive`);
      error.status = 400;
      throw error;
    }
  }

  return accounts;
};

const updateCashBankBalances = async (tx, lines) => {
  const cashBankAccounts = await tx.cashBankAccount.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      account: true,
    },
  });

  for (const cashBankAccount of cashBankAccounts) {
    const relatedLines = lines.filter(
      (line) => line.accountId === cashBankAccount.accountId
    );

    if (relatedLines.length === 0) {
      continue;
    }

    const totalDebit = relatedLines.reduce(
      (total, line) => total + line.debit,
      0
    );

    const totalCredit = relatedLines.reduce(
      (total, line) => total + line.credit,
      0
    );

    const balanceChange = totalDebit - totalCredit;
    const newBalance = cashBankAccount.currentBalance + balanceChange;

    if (newBalance < 0) {
      const error = new Error(
        `Cash/bank balance is not enough for ${cashBankAccount.name}`
      );
      error.status = 400;
      throw error;
    }

    await tx.cashBankAccount.update({
      where: {
        id: cashBankAccount.id,
      },
      data: {
        currentBalance: newBalance,
      },
    });
  }
};

const createJournalEntryWithLines = async ({
  tx,
  entryDate,
  description,
  sourceType,
  sourceId,
  reversalOfId,
  lines,
  createdById,
}) => {
  const normalizedLines = lines.map((line) => ({
    accountId: line.accountId,
    debit: line.debit || 0,
    credit: line.credit || 0,
    note: line.note,
  }));

  await validateJournalAccounts(tx, normalizedLines);

  const totalDebit = normalizedLines.reduce(
    (total, line) => total + line.debit,
    0
  );

  const totalCredit = normalizedLines.reduce(
    (total, line) => total + line.credit,
    0
  );

  if (totalDebit !== totalCredit) {
    const error = new Error("Total debit and credit must be balanced");
    error.status = 400;
    throw error;
  }

  await updateCashBankBalances(tx, normalizedLines);

  const entryNumber = generateJournalEntryNumber();

  return tx.journalEntry.create({
  data: {
    entryNumber,
    entryDate,
    description,
    sourceType,
    sourceId,
    reversalOfId,
    createdById,
      lines: {
        create: normalizedLines,
      },
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      },
      lines: {
        include: {
          account: true,
        },
      },
    },
  });
};

const getAccountByCode = async (tx, code) => {
  const account = await tx.account.findUnique({
    where: {
      code,
    },
  });

  if (!account) {
    const error = new Error(`Account with code ${code} not found`);
    error.status = 404;
    throw error;
  }

  if (account.status !== "ACTIVE") {
    const error = new Error(`Account ${account.name} is inactive`);
    error.status = 400;
    throw error;
  }

  return account;
};

const getCashBankAccountForPayment = async (
  tx,
  cashBankAccountId,
  paymentMethod
) => {
  if (!cashBankAccountId) {
    const error = new Error("Cash/bank account is required");
    error.status = 400;
    throw error;
  }

  const cashBankAccount = await tx.cashBankAccount.findUnique({
    where: {
      id: cashBankAccountId,
    },
    include: {
      account: true,
    },
  });

  if (!cashBankAccount) {
    const error = new Error("Cash/bank account not found");
    error.status = 404;
    throw error;
  }

  if (cashBankAccount.status !== "ACTIVE") {
    const error = new Error("Cash/bank account is inactive");
    error.status = 400;
    throw error;
  }

  if (paymentMethod === "CASH" && cashBankAccount.type !== "CASH") {
    const error = new Error("Cash payment must use cash account");
    error.status = 400;
    throw error;
  }

  if (paymentMethod === "TRANSFER" && cashBankAccount.type !== "BANK") {
    const error = new Error("Transfer payment must use bank account");
    error.status = 400;
    throw error;
  }

  return cashBankAccount;
};

module.exports = {
  createJournalEntryWithLines,
  getAccountByCode,
  getCashBankAccountForPayment,
};