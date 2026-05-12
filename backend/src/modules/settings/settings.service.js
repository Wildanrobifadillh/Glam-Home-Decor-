const bcrypt = require("bcrypt");
const prisma = require("../../config/prisma");

const STORE_PROFILE_KEY = "MAIN";

const getDefaultStoreProfileData = () => ({
  key: STORE_PROFILE_KEY,
  name: "Glam Home Decor",
  legalName: "Glam Home Decor",
  brandShortName: "GHD",
  address:
    "Jl. Ir. H. Juanda No.100c, Panyingkiran, Kec. Bungursari, Kab. Tasikmalaya, Jawa Barat 46151",
  phone: "081228811006",
  email: null,
  website: null,
  socialMedia: "Instagram @glamhome_decor",
  logoUrl: null,
  taxNumber: null,
  businessNumber: null,
});

const normalizeEmptyString = (value) => {
  if (value === "") {
    return null;
  }

  return value;
};

const getStoreProfile = async () => {
  return prisma.storeProfile.upsert({
    where: {
      key: STORE_PROFILE_KEY,
    },
    update: {},
    create: getDefaultStoreProfileData(),
  });
};

const updateStoreProfile = async (data) => {
  return prisma.storeProfile.upsert({
    where: {
      key: STORE_PROFILE_KEY,
    },
    update: {
      name: data.name,
      legalName: normalizeEmptyString(data.legalName),
      brandShortName: normalizeEmptyString(data.brandShortName),
      address: normalizeEmptyString(data.address),
      phone: normalizeEmptyString(data.phone),
      email: normalizeEmptyString(data.email),
      website: normalizeEmptyString(data.website),
      socialMedia: normalizeEmptyString(data.socialMedia),
      logoUrl: normalizeEmptyString(data.logoUrl),
      taxNumber: normalizeEmptyString(data.taxNumber),
      businessNumber: normalizeEmptyString(data.businessNumber),
    },
    create: {
      key: STORE_PROFILE_KEY,
      name: data.name,
      legalName: normalizeEmptyString(data.legalName),
      brandShortName: normalizeEmptyString(data.brandShortName),
      address: normalizeEmptyString(data.address),
      phone: normalizeEmptyString(data.phone),
      email: normalizeEmptyString(data.email),
      website: normalizeEmptyString(data.website),
      socialMedia: normalizeEmptyString(data.socialMedia),
      logoUrl: normalizeEmptyString(data.logoUrl),
      taxNumber: normalizeEmptyString(data.taxNumber),
      businessNumber: normalizeEmptyString(data.businessNumber),
    },
  });
};

const getStoreBankAccounts = async () => {
  return prisma.cashBankAccount.findMany({
    where: {
      type: "BANK",
    },
    include: {
      account: true,
    },
    orderBy: [
      {
        isDefaultForInvoice: "desc",
      },
      {
        createdAt: "asc",
      },
    ],
  });
};

const getStoreBankAccountById = async (id) => {
  const storeBankAccount = await prisma.cashBankAccount.findUnique({
    where: {
      id,
    },
    include: {
      account: true,
    },
  });

  if (!storeBankAccount || storeBankAccount.type !== "BANK") {
    const error = new Error("Store bank account not found");
    error.status = 404;
    throw error;
  }

  return storeBankAccount;
};

const validateBankAccountCoa = async (tx, accountId) => {
  const account = await tx.account.findUnique({
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
    const error = new Error("Bank account must use an asset account");
    error.status = 400;
    throw error;
  }

  return account;
};

const createStoreBankAccount = async (data) => {
  return prisma.$transaction(async (tx) => {
    await validateBankAccountCoa(tx, data.accountId);

    const activeBankAccountCount = await tx.cashBankAccount.count({
      where: {
        type: "BANK",
        status: "ACTIVE",
      },
    });

    const shouldSetDefault =
      data.isDefaultForInvoice || activeBankAccountCount === 0;

    if (shouldSetDefault) {
      await tx.cashBankAccount.updateMany({
        where: {
          type: "BANK",
        },
        data: {
          isDefaultForInvoice: false,
        },
      });
    }

    const storeBankAccount = await tx.cashBankAccount.create({
      data: {
        accountId: data.accountId,
        name: data.name,
        type: "BANK",
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountHolderName: data.accountHolderName,
        currentBalance: 0,
        status: "ACTIVE",
        isDefaultForInvoice: shouldSetDefault,
      },
    });

    return tx.cashBankAccount.findUnique({
      where: {
        id: storeBankAccount.id,
      },
      include: {
        account: true,
      },
    });
  });
};

const updateStoreBankAccount = async (id, data) => {
  return prisma.$transaction(async (tx) => {
    const storeBankAccount = await tx.cashBankAccount.findUnique({
      where: {
        id,
      },
    });

    if (!storeBankAccount || storeBankAccount.type !== "BANK") {
      const error = new Error("Store bank account not found");
      error.status = 404;
      throw error;
    }

    await validateBankAccountCoa(tx, data.accountId);

    if (data.isDefaultForInvoice && storeBankAccount.status !== "ACTIVE") {
      const error = new Error("Only active bank account can be set as default");
      error.status = 400;
      throw error;
    }

    if (data.isDefaultForInvoice) {
      await tx.cashBankAccount.updateMany({
        where: {
          type: "BANK",
          id: {
            not: id,
          },
        },
        data: {
          isDefaultForInvoice: false,
        },
      });
    }

    const updatedStoreBankAccount = await tx.cashBankAccount.update({
      where: {
        id,
      },
      data: {
        accountId: data.accountId,
        name: data.name,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountHolderName: data.accountHolderName,
        isDefaultForInvoice: data.isDefaultForInvoice,
      },
    });

    return tx.cashBankAccount.findUnique({
      where: {
        id: updatedStoreBankAccount.id,
      },
      include: {
        account: true,
      },
    });
  });
};

const setDefaultStoreBankAccount = async (id) => {
  return prisma.$transaction(async (tx) => {
    const storeBankAccount = await tx.cashBankAccount.findUnique({
      where: {
        id,
      },
    });

    if (!storeBankAccount || storeBankAccount.type !== "BANK") {
      const error = new Error("Store bank account not found");
      error.status = 404;
      throw error;
    }

    if (storeBankAccount.status !== "ACTIVE") {
      const error = new Error("Only active bank account can be set as default");
      error.status = 400;
      throw error;
    }

    await tx.cashBankAccount.updateMany({
      where: {
        type: "BANK",
      },
      data: {
        isDefaultForInvoice: false,
      },
    });

    const updatedStoreBankAccount = await tx.cashBankAccount.update({
      where: {
        id,
      },
      data: {
        isDefaultForInvoice: true,
      },
    });

    return tx.cashBankAccount.findUnique({
      where: {
        id: updatedStoreBankAccount.id,
      },
      include: {
        account: true,
      },
    });
  });
};

const updateStoreBankAccountStatus = async (id, status) => {
  return prisma.$transaction(async (tx) => {
    const storeBankAccount = await tx.cashBankAccount.findUnique({
      where: {
        id,
      },
    });

    if (!storeBankAccount || storeBankAccount.type !== "BANK") {
      const error = new Error("Store bank account not found");
      error.status = 404;
      throw error;
    }

    const updatedStoreBankAccount = await tx.cashBankAccount.update({
      where: {
        id,
      },
      data: {
        status,
        isDefaultForInvoice:
          status === "INACTIVE" ? false : storeBankAccount.isDefaultForInvoice,
      },
    });

    return tx.cashBankAccount.findUnique({
      where: {
        id: updatedStoreBankAccount.id,
      },
      include: {
        account: true,
      },
    });
  });
};

const userSelect = {
  id: true,
  name: true,
  username: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  employee: true,
};

const getSettingsUsers = async () => {
  return prisma.user.findMany({
    select: userSelect,
    orderBy: {
      createdAt: "asc",
    },
  });
};

const getSettingsUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: userSelect,
  });

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  return user;
};

const ensureUsernameIsAvailable = async (username, ignoredUserId = null) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (existingUser && existingUser.id !== ignoredUserId) {
    const error = new Error("Username already exists");
    error.status = 400;
    throw error;
  }
};

const ensureAnotherActiveOwnerExists = async (userId) => {
  const activeOwnerCount = await prisma.user.count({
    where: {
      role: "OWNER",
      status: "ACTIVE",
      id: {
        not: userId,
      },
    },
  });

  if (activeOwnerCount === 0) {
    const error = new Error("At least one active owner is required");
    error.status = 400;
    throw error;
  }
};

const createSettingsUser = async (data) => {
  await ensureUsernameIsAvailable(data.username);

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      username: data.username,
      passwordHash,
      role: data.role,
      status: "ACTIVE",
    },
    select: userSelect,
  });

  return user;
};

const updateSettingsUser = async (id, data) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  await ensureUsernameIsAvailable(data.username, id);

  return prisma.user.update({
    where: {
      id,
    },
    data: {
      name: data.name,
      username: data.username,
    },
    select: userSelect,
  });
};

const updateSettingsUserRole = async (id, role, currentUserId) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  if (id === currentUserId) {
    const error = new Error("You cannot change your own role");
    error.status = 400;
    throw error;
  }

  if (user.role === "OWNER" && role !== "OWNER") {
    await ensureAnotherActiveOwnerExists(id);
  }

  return prisma.user.update({
    where: {
      id,
    },
    data: {
      role,
    },
    select: userSelect,
  });
};

const updateSettingsUserStatus = async (id, status, currentUserId) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  if (id === currentUserId && status === "INACTIVE") {
    const error = new Error("You cannot deactivate your own account");
    error.status = 400;
    throw error;
  }

  if (user.role === "OWNER" && status === "INACTIVE") {
    await ensureAnotherActiveOwnerExists(id);
  }

  return prisma.user.update({
    where: {
      id,
    },
    data: {
      status,
    },
    select: userSelect,
  });
};

const resetSettingsUserPassword = async (id, password) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.update({
    where: {
      id,
    },
    data: {
      passwordHash,
    },
    select: userSelect,
  });
};

module.exports = {
  getStoreProfile,
  updateStoreProfile,
  getStoreBankAccounts,
  getStoreBankAccountById,
  createStoreBankAccount,
  updateStoreBankAccount,
  setDefaultStoreBankAccount,
  updateStoreBankAccountStatus,
  getSettingsUsers,
  getSettingsUserById,
  createSettingsUser,
  updateSettingsUser,
  updateSettingsUserRole,
  updateSettingsUserStatus,
  resetSettingsUserPassword,
};