const {
  generateJournalEntryNumber,
} = require("./generateJournalEntryNumber");

const normalizeJournalLines = (lines) => {
  if (!Array.isArray(lines)) {
    const error = new Error("Journal lines must be an array");
    error.status = 400;
    throw error;
  }

  return lines.map((line, index) => {
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);

    if (Number.isNaN(debit) || Number.isNaN(credit)) {
      const error = new Error(
        `Debit/credit value is invalid on line ${index + 1}`
      );
      error.status = 400;
      throw error;
    }

    return {
      accountId: line.accountId,
      debit,
      credit,
      note: line.note || null,
    };
  });
};

const validateJournalLines = (lines) => {
  if (lines.length < 2) {
    const error = new Error("Journal entry must have at least 2 lines");
    error.status = 400;
    throw error;
  }

  let totalDebit = 0;
  let totalCredit = 0;

  lines.forEach((line, index) => {
    if (!line.accountId) {
      const error = new Error(`Account is required on line ${index + 1}`);
      error.status = 400;
      throw error;
    }

    if (line.debit < 0 || line.credit < 0) {
      const error = new Error(
        `Debit/credit cannot be negative on line ${index + 1}`
      );
      error.status = 400;
      throw error;
    }

    if (line.debit > 0 && line.credit > 0) {
      const error = new Error(
        `Line ${index + 1} cannot have debit and credit at the same time`
      );
      error.status = 400;
      throw error;
    }

    if (line.debit === 0 && line.credit === 0) {
      const error = new Error(
        `Line ${index + 1} must have either debit or credit`
      );
      error.status = 400;
      throw error;
    }

    totalDebit += line.debit;
    totalCredit += line.credit;
  });

  if (totalDebit !== totalCredit) {
    const error = new Error("Total debit and credit must be balanced");
    error.status = 400;
    throw error;
  }

  return {
    totalDebit,
    totalCredit,
  };
};

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
  const accountIds = [...new Set(lines.map((line) => line.accountId))];

  const relatedCashBankAccounts = await tx.cashBankAccount.findMany({
    where: {
      accountId: {
        in: accountIds,
      },
    },
    include: {
      account: true,
    },
  });

  for (const cashBankAccount of relatedCashBankAccounts) {
    if (cashBankAccount.status !== "ACTIVE") {
      const error = new Error(
        `Cash/bank account ${cashBankAccount.name} is inactive`
      );
      error.status = 400;
      throw error;
    }

    if (!cashBankAccount.account) {
      const error = new Error(
        `Accounting account for cash/bank ${cashBankAccount.name} was not found`
      );
      error.status = 404;
      throw error;
    }

    if (cashBankAccount.account.status !== "ACTIVE") {
      const error = new Error(
        `Accounting account for cash/bank ${cashBankAccount.name} is inactive`
      );
      error.status = 400;
      throw error;
    }

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
  const normalizedLines = normalizeJournalLines(lines);

  validateJournalLines(normalizedLines);
  await validateJournalAccounts(tx, normalizedLines);
  await updateCashBankBalances(tx, normalizedLines);

  const entryNumber = generateJournalEntryNumber();

  return tx.journalEntry.create({
    data: {
      entryNumber,
      entryDate: entryDate || new Date(),
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

  if (!cashBankAccount.accountId || !cashBankAccount.account) {
    const error = new Error("Cash/bank account is not linked to accounting account");
    error.status = 400;
    throw error;
  }

  if (cashBankAccount.account.status !== "ACTIVE") {
    const error = new Error("Linked accounting account is inactive");
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