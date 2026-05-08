const prisma = require("../../config/prisma");

const getDefaultNormalBalance = (type) => {
  if (["ASSET", "COGS", "EXPENSE"].includes(type)) {
    return "DEBIT";
  }

  return "CREDIT";
};

const validateParentAccount = async (parentId, accountId = null) => {
  if (!parentId) {
    return;
  }

  if (parentId === accountId) {
    const error = new Error("Account cannot be its own parent");
    error.status = 400;
    throw error;
  }

  const parentAccount = await prisma.account.findUnique({
    where: {
      id: parentId,
    },
  });

  if (!parentAccount) {
    const error = new Error("Parent account not found");
    error.status = 404;
    throw error;
  }

  if (parentAccount.status !== "ACTIVE") {
    const error = new Error("Parent account is inactive");
    error.status = 400;
    throw error;
  }
};

const validateUniqueCode = async (code, accountId = null) => {
  if (!code) {
    return;
  }

  const existingAccount = await prisma.account.findUnique({
    where: {
      code,
    },
  });

  if (existingAccount && existingAccount.id !== accountId) {
    const error = new Error("Account code already exists");
    error.status = 400;
    throw error;
  }
};

const getAllAccounts = async () => {
  return prisma.account.findMany({
    include: {
      parent: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
        },
      },
      children: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          status: true,
        },
        orderBy: {
          code: "asc",
        },
      },
    },
    orderBy: {
      code: "asc",
    },
  });
};

const getAccountById = async (id) => {
  const account = await prisma.account.findUnique({
    where: {
      id,
    },
    include: {
      parent: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
        },
      },
      children: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          status: true,
        },
        orderBy: {
          code: "asc",
        },
      },
      cashBankAccounts: true,
    },
  });

  if (!account) {
    const error = new Error("Account not found");
    error.status = 404;
    throw error;
  }

  return account;
};

const createAccount = async ({ code, name, type, normalBalance, parentId }) => {
  await validateUniqueCode(code);
  await validateParentAccount(parentId);

  return prisma.account.create({
    data: {
      code,
      name,
      type,
      normalBalance: normalBalance || getDefaultNormalBalance(type),
      parentId,
    },
    include: {
      parent: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
        },
      },
      children: true,
    },
  });
};

const updateAccount = async (
  id,
  { code, name, type, normalBalance, parentId, status }
) => {
  const account = await prisma.account.findUnique({
    where: {
      id,
    },
  });

  if (!account) {
    const error = new Error("Account not found");
    error.status = 404;
    throw error;
  }

  await validateUniqueCode(code, id);
  await validateParentAccount(parentId, id);

  const finalType = type || account.type;
  const finalNormalBalance =
    normalBalance || (type ? getDefaultNormalBalance(finalType) : undefined);

  return prisma.account.update({
    where: {
      id,
    },
    data: {
      code,
      name,
      type,
      normalBalance: finalNormalBalance,
      parentId,
      status,
    },
    include: {
      parent: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
        },
      },
      children: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          status: true,
        },
      },
    },
  });
};

const deactivateAccount = async (id) => {
  const account = await prisma.account.findUnique({
    where: {
      id,
    },
    include: {
      children: true,
      cashBankAccounts: true,
    },
  });

  if (!account) {
    const error = new Error("Account not found");
    error.status = 404;
    throw error;
  }

  const hasActiveChildren = account.children.some(
    (child) => child.status === "ACTIVE"
  );

  if (hasActiveChildren) {
    const error = new Error("Account has active child accounts");
    error.status = 400;
    throw error;
  }

  const hasActiveCashBankAccounts = account.cashBankAccounts.some(
    (cashBankAccount) => cashBankAccount.status === "ACTIVE"
  );

  if (hasActiveCashBankAccounts) {
    const error = new Error("Account is used by active cash/bank account");
    error.status = 400;
    throw error;
  }

  return prisma.account.update({
    where: {
      id,
    },
    data: {
      status: "INACTIVE",
    },
  });
};

module.exports = {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deactivateAccount,
};