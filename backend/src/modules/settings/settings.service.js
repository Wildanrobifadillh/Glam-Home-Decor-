const bcrypt = require("bcrypt");
const prisma = require("../../config/prisma");

const OPERATIONAL_PREFERENCE_KEY = "MAIN";
const STORE_PROFILE_KEY = "MAIN";
const DOCUMENT_SETTING_KEY = "MAIN";


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

const employeeInclude = {
  user: {
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      status: true,
    },
  },
};

const getSettingsEmployees = async () => {
  return prisma.employee.findMany({
    include: employeeInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getSettingsEmployeeById = async (id) => {
  const employee = await prisma.employee.findUnique({
    where: {
      id,
    },
    include: employeeInclude,
  });

  if (!employee) {
    const error = new Error("Employee not found");
    error.status = 404;
    throw error;
  }

  return employee;
};

const ensureUserCanBeLinkedToEmployee = async (userId, employeeId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const existingEmployee = await prisma.employee.findUnique({
    where: {
      userId,
    },
  });

  if (existingEmployee && existingEmployee.id !== employeeId) {
    const error = new Error("User is already linked to another employee");
    error.status = 400;
    throw error;
  }

  return user;
};

const updateSettingsEmployee = async (id, data) => {
  const employee = await prisma.employee.findUnique({
    where: {
      id,
    },
  });

  if (!employee) {
    const error = new Error("Employee not found");
    error.status = 404;
    throw error;
  }

  return prisma.employee.update({
    where: {
      id,
    },
    data: {
      name: data.name,
      phone: normalizeEmptyString(data.phone),
      address: normalizeEmptyString(data.address),
      position: data.position,
      baseSalary: data.baseSalary,
      joinedAt: data.joinedAt,
    },
    include: employeeInclude,
  });
};

const updateSettingsEmployeeStatus = async (id, status) => {
  const employee = await prisma.employee.findUnique({
    where: {
      id,
    },
  });

  if (!employee) {
    const error = new Error("Employee not found");
    error.status = 404;
    throw error;
  }

  return prisma.employee.update({
    where: {
      id,
    },
    data: {
      status,
    },
    include: employeeInclude,
  });
};

const linkSettingsEmployeeUser = async (id, userId) => {
  const employee = await prisma.employee.findUnique({
    where: {
      id,
    },
  });

  if (!employee) {
    const error = new Error("Employee not found");
    error.status = 404;
    throw error;
  }

  await ensureUserCanBeLinkedToEmployee(userId, id);

  return prisma.employee.update({
    where: {
      id,
    },
    data: {
      userId,
    },
    include: employeeInclude,
  });
};

const unlinkSettingsEmployeeUser = async (id) => {
  const employee = await prisma.employee.findUnique({
    where: {
      id,
    },
  });

  if (!employee) {
    const error = new Error("Employee not found");
    error.status = 404;
    throw error;
  }

  return prisma.employee.update({
    where: {
      id,
    },
    data: {
      userId: null,
    },
    include: employeeInclude,
  });
};

const SETTINGS_MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    group: "Umum",
  },
  {
    key: "categories",
    label: "Kategori",
    group: "Master Data",
  },
  {
    key: "products",
    label: "Barang",
    group: "Master Data",
  },
  {
    key: "suppliers",
    label: "Supplier",
    group: "Master Data",
  },
  {
    key: "customers",
    label: "Pelanggan",
    group: "Master Data",
  },
  {
    key: "employees",
    label: "Karyawan",
    group: "Master Data",
  },
  {
    key: "inventory",
    label: "Inventory",
    group: "Stok",
  },
  {
    key: "stock_history",
    label: "Histori Stok",
    group: "Stok",
  },
  {
    key: "stock_opname",
    label: "Stock Opname",
    group: "Stok",
  },
  {
    key: "purchases",
    label: "Pembelian",
    group: "Transaksi",
  },
  {
    key: "sales",
    label: "Penjualan",
    group: "Transaksi",
  },
  {
    key: "sale_returns",
    label: "Retur Penjualan",
    group: "Transaksi",
  },
  {
    key: "purchase_returns",
    label: "Retur Pembelian",
    group: "Transaksi",
  },
  {
    key: "receivables",
    label: "Piutang",
    group: "Keuangan",
  },
  {
    key: "payables",
    label: "Hutang",
    group: "Keuangan",
  },
  {
    key: "cash_bank_accounts",
    label: "Kas/Bank",
    group: "Keuangan",
  },
  {
    key: "expenses",
    label: "Beban Operasional",
    group: "Keuangan",
  },
  {
    key: "payroll",
    label: "Payroll",
    group: "Keuangan",
  },
  {
    key: "accounting",
    label: "Akuntansi",
    group: "Akuntansi",
  },
  {
    key: "journal_entries",
    label: "Jurnal",
    group: "Akuntansi",
  },
  {
    key: "reports",
    label: "Laporan",
    group: "Laporan",
  },
  {
    key: "settings",
    label: "Pengaturan",
    group: "Sistem",
  },
];

const DEFAULT_ROLE_MODULES = {
  ADMIN_STAFF: [
    "dashboard",
    "categories",
    "products",
    "suppliers",
    "customers",
    "employees",
    "purchases",
    "sales",
    "sale_returns",
    "purchase_returns",
    "receivables",
    "payables",
    "cash_bank_accounts",
    "expenses",
    "reports",
  ],
  STAFF_GUDANG: [
    "dashboard",
    "products",
    "inventory",
    "stock_history",
    "stock_opname",
    "sale_returns",
    "purchase_returns",
  ],
};

const MANAGEABLE_PERMISSION_ROLES = ["ADMIN_STAFF", "STAFF_GUDANG"];

const getSettingsModules = async () => {
  return SETTINGS_MODULES;
};

const getModuleKeys = () => SETTINGS_MODULES.map((module) => module.key);

const validatePermissionRole = (role) => {
  if (role === "OWNER") {
    const error = new Error("Owner always has full access");
    error.status = 400;
    throw error;
  }

  if (!MANAGEABLE_PERMISSION_ROLES.includes(role)) {
    const error = new Error("Invalid role permission");
    error.status = 400;
    throw error;
  }
};

const validateModuleKeys = (moduleKeys) => {
  const availableModuleKeys = getModuleKeys();

  for (const moduleKey of moduleKeys) {
    if (!availableModuleKeys.includes(moduleKey)) {
      const error = new Error(`Invalid module key: ${moduleKey}`);
      error.status = 400;
      throw error;
    }
  }
};

const getOwnerPermissions = () => {
  return {
    role: "OWNER",
    permissions: SETTINGS_MODULES.map((module) => ({
      ...module,
      canAccess: true,
    })),
  };
};

const ensureDefaultRolePermissions = async (role) => {
  validatePermissionRole(role);

  const defaultModuleKeys = DEFAULT_ROLE_MODULES[role] || [];

  for (const module of SETTINGS_MODULES) {
    await prisma.rolePermission.upsert({
      where: {
        role_moduleKey: {
          role,
          moduleKey: module.key,
        },
      },
      update: {},
      create: {
        role,
        moduleKey: module.key,
        canAccess: defaultModuleKeys.includes(module.key),
      },
    });
  }
};

const buildRolePermissionResponse = (role, rolePermissions) => {
  return {
    role,
    permissions: SETTINGS_MODULES.map((module) => {
      const permission = rolePermissions.find(
        (item) => item.moduleKey === module.key
      );

      return {
        ...module,
        canAccess: permission ? permission.canAccess : false,
      };
    }),
  };
};

const getRolePermissionsByRole = async (role) => {
  if (role === "OWNER") {
    return getOwnerPermissions();
  }

  validatePermissionRole(role);

  await ensureDefaultRolePermissions(role);

  const rolePermissions = await prisma.rolePermission.findMany({
    where: {
      role,
    },
    orderBy: {
      moduleKey: "asc",
    },
  });

  return buildRolePermissionResponse(role, rolePermissions);
};

const getAllRolePermissions = async () => {
  const adminStaffPermissions = await getRolePermissionsByRole("ADMIN_STAFF");
  const staffGudangPermissions = await getRolePermissionsByRole("STAFF_GUDANG");

  return {
    roles: [
      getOwnerPermissions(),
      adminStaffPermissions,
      staffGudangPermissions,
    ],
  };
};

const updateRolePermissions = async (role, moduleKeys) => {
  validatePermissionRole(role);
  validateModuleKeys(moduleKeys);

  const enabledModuleKeys = new Set(moduleKeys);

  await prisma.$transaction(async (tx) => {
    for (const module of SETTINGS_MODULES) {
      await tx.rolePermission.upsert({
        where: {
          role_moduleKey: {
            role,
            moduleKey: module.key,
          },
        },
        update: {
          canAccess: enabledModuleKeys.has(module.key),
        },
        create: {
          role,
          moduleKey: module.key,
          canAccess: enabledModuleKeys.has(module.key),
        },
      });
    }
  });

  return getRolePermissionsByRole(role);
};

const getMyPermissions = async (role) => {
  if (role === "OWNER") {
    return getOwnerPermissions();
  }

  return getRolePermissionsByRole(role);
};

const changePassword = async ({ userId, oldPassword, newPassword }) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  if (user.status !== "ACTIVE") {
    const error = new Error("User account is inactive");
    error.status = 403;
    throw error;
  }

  const isOldPasswordValid = await bcrypt.compare(
    oldPassword,
    user.passwordHash
  );

  if (!isOldPasswordValid) {
    const error = new Error("Old password is incorrect");
    error.status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      passwordHash,
    },
    select: userSelect,
  });
};

const getDefaultOperationalPreferencesData = () => ({
  key: OPERATIONAL_PREFERENCE_KEY,
  defaultReceivableDueDays: 7,
  defaultPayableDueDays: 14,
  defaultPaymentMethod: "CASH",
  defaultCashBankAccountId: null,
  requireReceivableApproval: true,
});

const validateDefaultCashBankAccount = async ({
  defaultCashBankAccountId,
  defaultPaymentMethod,
}) => {
  if (!defaultCashBankAccountId) {
    return;
  }

  const cashBankAccount = await prisma.cashBankAccount.findUnique({
    where: {
      id: defaultCashBankAccountId,
    },
  });

  if (!cashBankAccount) {
    const error = new Error("Default cash/bank account not found");
    error.status = 404;
    throw error;
  }

  if (cashBankAccount.status !== "ACTIVE") {
    const error = new Error("Default cash/bank account is inactive");
    error.status = 400;
    throw error;
  }

  if (defaultPaymentMethod === "CASH" && cashBankAccount.type !== "CASH") {
    const error = new Error("Default payment method CASH must use cash account");
    error.status = 400;
    throw error;
  }

  if (defaultPaymentMethod === "TRANSFER" && cashBankAccount.type !== "BANK") {
    const error = new Error(
      "Default payment method TRANSFER must use bank account"
    );
    error.status = 400;
    throw error;
  }
};

const getOperationalPreferences = async () => {
  return prisma.operationalPreference.upsert({
    where: {
      key: OPERATIONAL_PREFERENCE_KEY,
    },
    update: {},
    create: getDefaultOperationalPreferencesData(),
  });
};

const updateOperationalPreferences = async (data) => {
  await validateDefaultCashBankAccount({
    defaultCashBankAccountId: data.defaultCashBankAccountId,
    defaultPaymentMethod: data.defaultPaymentMethod,
  });

  return prisma.operationalPreference.upsert({
    where: {
      key: OPERATIONAL_PREFERENCE_KEY,
    },
    update: {
      defaultReceivableDueDays: data.defaultReceivableDueDays,
      defaultPayableDueDays: data.defaultPayableDueDays,
      defaultPaymentMethod: data.defaultPaymentMethod,
      defaultCashBankAccountId: data.defaultCashBankAccountId || null,
      requireReceivableApproval: data.requireReceivableApproval,
    },
    create: {
      key: OPERATIONAL_PREFERENCE_KEY,
      defaultReceivableDueDays: data.defaultReceivableDueDays,
      defaultPayableDueDays: data.defaultPayableDueDays,
      defaultPaymentMethod: data.defaultPaymentMethod,
      defaultCashBankAccountId: data.defaultCashBankAccountId || null,
      requireReceivableApproval: data.requireReceivableApproval,
    },
  });
};

const getDefaultDocumentSettingData = () => ({
  key: DOCUMENT_SETTING_KEY,
  documentLanguage: "ID",

  salesInvoicePrefix: "INV-SALE-GHD",
  salesReturnPrefix: "RET-SALE-GHD",
  purchaseReturnPrefix: "RET-PUR-GHD",
  payrollSlipPrefix: "PAYSLIP-GHD",
  reportPrefix: "RPT-GHD",
  deliveryOrderPrefix: "SJ-GHD",
  resetNumberMonthly: true,

  defaultPaperSize: "F4",
  alternatePaperSize: "A4",
  invoiceCopies: 3,
  maxItemsF4: 12,
  maxItemsA4: 8,

  copyLabel1: "LEMBAR 1 - PELANGGAN",
  copyLabel2: "LEMBAR 2 - ADMIN / KEUANGAN",
  copyLabel3: "LEMBAR 3 - ARSIP TOKO",

  thankYouNote:
    "Terima kasih atas kepercayaan Anda berbelanja di Glam Home Decor.",
  transactionProofNote: "Invoice ini merupakan bukti transaksi resmi.",
  complaintTerms:
    "Komplain maksimal 3 hari setelah barang diterima dan wajib menyertakan invoice.",
  returnTerms: "Barang yang sudah dibeli mengikuti ketentuan retur toko.",
  paymentTerms:
    "Pembayaran dianggap sah setelah dana diterima oleh pihak Glam Home Decor.",
  additionalNote: "Simpan invoice ini sebagai bukti transaksi.",

  responsiblePersonName: "Zaid Ishmatul Fawaid",
  responsiblePersonTitle: "Penanggung Jawab / Owner",
  showSignature: true,
  signatureUrl: null,
  showStamp: true,
  stampUrl: null,
  signatureText: "Hormat kami,\nGlam Home Decor",
});

const getDocumentSetting = async () => {
  return prisma.documentSetting.upsert({
    where: {
      key: DOCUMENT_SETTING_KEY,
    },
    update: {},
    create: getDefaultDocumentSettingData(),
  });
};

const updateDocumentSetting = async (data) => {
  return prisma.documentSetting.upsert({
    where: {
      key: DOCUMENT_SETTING_KEY,
    },
    update: {
      documentLanguage: data.documentLanguage,

      salesInvoicePrefix: data.salesInvoicePrefix,
      salesReturnPrefix: data.salesReturnPrefix,
      purchaseReturnPrefix: data.purchaseReturnPrefix,
      payrollSlipPrefix: data.payrollSlipPrefix,
      reportPrefix: data.reportPrefix,
      deliveryOrderPrefix: normalizeEmptyString(data.deliveryOrderPrefix),
      resetNumberMonthly: data.resetNumberMonthly,

      defaultPaperSize: data.defaultPaperSize,
      alternatePaperSize: data.alternatePaperSize,
      invoiceCopies: data.invoiceCopies,
      maxItemsF4: data.maxItemsF4,
      maxItemsA4: data.maxItemsA4,

      copyLabel1: data.copyLabel1,
      copyLabel2: data.copyLabel2,
      copyLabel3: data.copyLabel3,

      thankYouNote: normalizeEmptyString(data.thankYouNote),
      transactionProofNote: normalizeEmptyString(data.transactionProofNote),
      complaintTerms: normalizeEmptyString(data.complaintTerms),
      returnTerms: normalizeEmptyString(data.returnTerms),
      paymentTerms: normalizeEmptyString(data.paymentTerms),
      additionalNote: normalizeEmptyString(data.additionalNote),

      responsiblePersonName: data.responsiblePersonName,
      responsiblePersonTitle: data.responsiblePersonTitle,
      showSignature: data.showSignature,
      signatureUrl: normalizeEmptyString(data.signatureUrl),
      showStamp: data.showStamp,
      stampUrl: normalizeEmptyString(data.stampUrl),
      signatureText: data.signatureText,
    },
    create: {
      key: DOCUMENT_SETTING_KEY,
      documentLanguage: data.documentLanguage,

      salesInvoicePrefix: data.salesInvoicePrefix,
      salesReturnPrefix: data.salesReturnPrefix,
      purchaseReturnPrefix: data.purchaseReturnPrefix,
      payrollSlipPrefix: data.payrollSlipPrefix,
      reportPrefix: data.reportPrefix,
      deliveryOrderPrefix: normalizeEmptyString(data.deliveryOrderPrefix),
      resetNumberMonthly: data.resetNumberMonthly,

      defaultPaperSize: data.defaultPaperSize,
      alternatePaperSize: data.alternatePaperSize,
      invoiceCopies: data.invoiceCopies,
      maxItemsF4: data.maxItemsF4,
      maxItemsA4: data.maxItemsA4,

      copyLabel1: data.copyLabel1,
      copyLabel2: data.copyLabel2,
      copyLabel3: data.copyLabel3,

      thankYouNote: normalizeEmptyString(data.thankYouNote),
      transactionProofNote: normalizeEmptyString(data.transactionProofNote),
      complaintTerms: normalizeEmptyString(data.complaintTerms),
      returnTerms: normalizeEmptyString(data.returnTerms),
      paymentTerms: normalizeEmptyString(data.paymentTerms),
      additionalNote: normalizeEmptyString(data.additionalNote),

      responsiblePersonName: data.responsiblePersonName,
      responsiblePersonTitle: data.responsiblePersonTitle,
      showSignature: data.showSignature,
      signatureUrl: normalizeEmptyString(data.signatureUrl),
      showStamp: data.showStamp,
      stampUrl: normalizeEmptyString(data.stampUrl),
      signatureText: data.signatureText,
    },
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
  getSettingsEmployees,
  getSettingsEmployeeById,
  updateSettingsEmployee,
  updateSettingsEmployeeStatus,
  linkSettingsEmployeeUser,
  unlinkSettingsEmployeeUser,
  getSettingsModules,
  getAllRolePermissions,
  getRolePermissionsByRole,
  updateRolePermissions,
  getMyPermissions,
  changePassword,
  getOperationalPreferences,
  updateOperationalPreferences,
  getDocumentSetting,
  updateDocumentSetting,
};