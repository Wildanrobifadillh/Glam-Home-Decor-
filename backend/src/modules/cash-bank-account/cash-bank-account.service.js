const prisma = require("../../config/prisma");

const validateAccount = async (accountId) => {
  if (!accountId) {
    return;
  }

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

  if (account.status !== "ACTIVE") {
    const error = new Error("Account is inactive");
    error.status = 400;
    throw error;
  }

  if (account.type !== "ASSET") {
    const error = new Error("Cash/bank account must use ASSET account");
    error.status = 400;
    throw error;
  }

  if (account.normalBalance !== "DEBIT") {
    const error = new Error("Cash/bank account must use debit normal balance");
    error.status = 400;
    throw error;
  }

  return account;
};

const getAllCashBankAccounts = async () => {
  return prisma.cashBankAccount.findMany({
    include: {
      account: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getCashBankAccountById = async (id) => {
  const cashBankAccount = await prisma.cashBankAccount.findUnique({
    where: {
      id,
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

  return cashBankAccount;
};

const createCashBankAccount = async ({
  accountId,
  name,
  type,
  bankName,
  accountNumber,
  currentBalance,
}) => {
  await validateAccount(accountId);

  if (type === "BANK" && !bankName) {
    const error = new Error("Bank name is required for bank account");
    error.status = 400;
    throw error;
  }

  return prisma.cashBankAccount.create({
    data: {
      accountId,
      name,
      type,
      bankName,
      accountNumber,
      currentBalance,
    },
    include: {
      account: true,
    },
  });
};

const updateCashBankAccount = async (
  id,
  { accountId, name, type, bankName, accountNumber, currentBalance, status }
) => {
  const cashBankAccount = await prisma.cashBankAccount.findUnique({
    where: {
      id,
    },
  });

  if (!cashBankAccount) {
    const error = new Error("Cash/bank account not found");
    error.status = 404;
    throw error;
  }

  const finalType = type || cashBankAccount.type;
  const finalBankName =
    bankName !== undefined ? bankName : cashBankAccount.bankName;

  if (accountId) {
    await validateAccount(accountId);
  }

  if (finalType === "BANK" && !finalBankName) {
    const error = new Error("Bank name is required for bank account");
    error.status = 400;
    throw error;
  }

  return prisma.cashBankAccount.update({
    where: {
      id,
    },
    data: {
      accountId,
      name,
      type,
      bankName,
      accountNumber,
      currentBalance,
      status,
    },
    include: {
      account: true,
    },
  });
};

const deactivateCashBankAccount = async (id) => {
  const cashBankAccount = await prisma.cashBankAccount.findUnique({
    where: {
      id,
    },
  });

  if (!cashBankAccount) {
    const error = new Error("Cash/bank account not found");
    error.status = 404;
    throw error;
  }

  return prisma.cashBankAccount.update({
    where: {
      id,
    },
    data: {
      status: "INACTIVE",
    },
    include: {
      account: true,
    },
  });
};

module.exports = {
  getAllCashBankAccounts,
  getCashBankAccountById,
  createCashBankAccount,
  updateCashBankAccount,
  deactivateCashBankAccount,
};