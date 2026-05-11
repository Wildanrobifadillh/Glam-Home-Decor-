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

module.exports = {
  getStoreProfile,
  updateStoreProfile,
  getStoreBankAccounts,
  getStoreBankAccountById,
  createStoreBankAccount,
  updateStoreBankAccount,
  setDefaultStoreBankAccount,
  updateStoreBankAccountStatus,
};