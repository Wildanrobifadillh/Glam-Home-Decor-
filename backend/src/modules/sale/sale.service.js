const prisma = require("../../config/prisma");
const settingsService = require("../settings/settings.service");
const { generateSaleNumber } = require("../../utils/generateSaleNumber");
const {
  createJournalEntryWithLines,
  getAccountByCode,
  getCashBankAccountForPayment,
} = require("../../utils/accountingJournal");
const {
  generateSaleInvoicePdfBuffer,
} = require("./sale.invoice-pdf");

const OPERATIONAL_PREFERENCE_KEY = "MAIN";

const getPaymentStatus = (totalAmount, paidAmount) => {
  if (paidAmount === 0) {
    return "UNPAID";
  }

  if (paidAmount < totalAmount) {
    return "PARTIAL";
  }

  return "PAID";
};

const getDefaultOperationalPreferencesData = () => ({
  key: OPERATIONAL_PREFERENCE_KEY,
  defaultReceivableDueDays: 7,
  defaultPayableDueDays: 14,
  defaultPaymentMethod: "CASH",
  defaultCashBankAccountId: null,
  requireReceivableApproval: true,
});

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const createSaleStockHistories = async ({ tx, sale, items, createdById }) => {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    const product = await tx.product.findUnique({
      where: {
        id: item.productId,
      },
    });

    const stockBefore = product.stock;
    const stockAfter = stockBefore - item.quantity;

    if (stockAfter < 0) {
      const error = new Error(`Stock is not enough for ${product.name}`);
      error.status = 400;
      throw error;
    }

    await tx.product.update({
      where: {
        id: item.productId,
      },
      data: {
        stock: stockAfter,
      },
    });

    await tx.stockHistory.create({
      data: {
        movementNumber: `STK-OUT-${sale.saleNumber}-${index + 1}`,
        productId: item.productId,
        type: "OUT",
        quantity: item.quantity,
        stockBefore,
        stockAfter,
        note: `Penjualan ${sale.saleNumber}`,
        createdById,
      },
    });
  }
};

const createSaleJournal = async ({
  tx,
  sale,
  saleItems,
  cashBankAccountId,
  paymentMethod,
  createdById,
}) => {
  const salesRevenueAccount = await getAccountByCode(tx, "4101");
  const cogsAccount = await getAccountByCode(tx, "5101");
  const inventoryAccount = await getAccountByCode(tx, "1301");

  const lines = [];

  if (sale.paidAmount > 0) {
    const cashBankAccount = await getCashBankAccountForPayment(
      tx,
      cashBankAccountId,
      paymentMethod
    );

    lines.push({
      accountId: cashBankAccount.accountId,
      debit: sale.paidAmount,
      credit: 0,
      note: `Pembayaran penjualan ${sale.saleNumber}`,
    });
  }

  if (sale.remainingAmount > 0) {
    const receivableAccount = await getAccountByCode(tx, "1201");

    lines.push({
      accountId: receivableAccount.id,
      debit: sale.remainingAmount,
      credit: 0,
      note: `Piutang penjualan ${sale.saleNumber}`,
    });
  }

  lines.push({
    accountId: salesRevenueAccount.id,
    debit: 0,
    credit: sale.totalAmount,
    note: `Penjualan ${sale.saleNumber}`,
  });

  const totalCost = saleItems.reduce((total, item) => {
    return total + item.costPrice * item.quantity;
  }, 0);

  if (totalCost > 0) {
    lines.push({
      accountId: cogsAccount.id,
      debit: totalCost,
      credit: 0,
      note: `HPP penjualan ${sale.saleNumber}`,
    });

    lines.push({
      accountId: inventoryAccount.id,
      debit: 0,
      credit: totalCost,
      note: `Pengurangan persediaan penjualan ${sale.saleNumber}`,
    });
  }

  await createJournalEntryWithLines({
    tx,
    description: `Jurnal penjualan ${sale.saleNumber}`,
    sourceType: "SALE",
    sourceId: sale.id,
    lines,
    createdById,
  });
};

const createReceivablePaymentJournal = async ({
  tx,
  sale,
  amount,
  paymentMethod,
  cashBankAccountId,
  createdById,
}) => {
  const cashBankAccount = await getCashBankAccountForPayment(
    tx,
    cashBankAccountId,
    paymentMethod
  );

  const receivableAccount = await getAccountByCode(tx, "1201");

  await createJournalEntryWithLines({
    tx,
    description: `Pembayaran piutang ${sale.saleNumber}`,
    sourceType: "RECEIVABLE_PAYMENT",
    sourceId: sale.id,
    lines: [
      {
        accountId: cashBankAccount.accountId,
        debit: amount,
        credit: 0,
        note: `Kas/bank masuk pembayaran piutang ${sale.saleNumber}`,
      },
      {
        accountId: receivableAccount.id,
        debit: 0,
        credit: amount,
        note: `Pengurangan piutang ${sale.saleNumber}`,
      },
    ],
    createdById,
  });
};

const getAllSales = async () => {
  return prisma.sale.findMany({
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
      approvalHistories: {
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
        },
      },
      receivablePayments: {
        include: {
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
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getSaleById = async (id) => {
  const sale = await prisma.sale.findUnique({
    where: {
      id,
    },
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
          product: {
            include: {
              category: true,
            },
          },
        },
      },
      additionalCosts: true,
      approvalHistories: {
        include: {
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
          createdAt: "desc",
        },
      },
      receivablePayments: {
        include: {
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
          createdAt: "desc",
        },
      },
    },
  });

  if (!sale) {
    const error = new Error("Sale not found");
    error.status = 404;
    throw error;
  }

  return sale;
};

const createSale = async ({
  customerId,
  customerName,
  customerPhone,
  customerAddress,
  paidAmount,
  cashReceivedAmount,
  changeAmount,
  paymentMethod,
  cashBankAccountId,
  discountAmount,
  taxAmount,
  dueDate,
  additionalCosts,
  note,
  items,
  createdById,
  createdByRole,
}) => {
  return prisma.$transaction(async (tx) => {
    let customer = null;

    if (customerId) {
      customer = await tx.customer.findUnique({
        where: {
          id: customerId,
        },
      });

      if (!customer) {
        const error = new Error("Customer not found");
        error.status = 404;
        throw error;
      }

      if (customer.status !== "ACTIVE") {
        const error = new Error("Customer is inactive");
        error.status = 400;
        throw error;
      }
    }

    if (paidAmount > 0) {
      await getCashBankAccountForPayment(
        tx,
        cashBankAccountId,
        paymentMethod
      );
    }

    const operationalPreference = await tx.operationalPreference.upsert({
      where: {
        key: OPERATIONAL_PREFERENCE_KEY,
      },
      update: {},
      create: getDefaultOperationalPreferencesData(),
    });

    const productIds = items.map((item) => item.productId);
    const uniqueProductIds = [...new Set(productIds)];

    const products = await tx.product.findMany({
      where: {
        id: {
          in: uniqueProductIds,
        },
      },
    });

    if (products.length !== uniqueProductIds.length) {
      const error = new Error("One or more products were not found");
      error.status = 404;
      throw error;
    }

    for (const product of products) {
      if (product.status !== "ACTIVE") {
        const error = new Error(`Product ${product.name} is inactive`);
        error.status = 400;
        throw error;
      }
    }

    const normalizedDiscountAmount = discountAmount || 0;
    const normalizedTaxAmount = taxAmount || 0;

    let itemSubtotalAmount = 0;

    const saleItemsData = items.map((item) => {
      const product = products.find(
        (productItem) => productItem.id === item.productId
      );

      const costPrice = product.purchasePrice;
      const subtotal = item.quantity * item.sellingPrice;
      const profit = (item.sellingPrice - costPrice) * item.quantity;

      itemSubtotalAmount += subtotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        costPrice,
        profit,
        subtotal,
      };
    });

    const additionalCostsData = (additionalCosts || []).map(
      (additionalCost) => ({
        name: additionalCost.name,
        amount: additionalCost.amount,
        note: additionalCost.note,
      })
    );

    const totalAdditionalCostAmount = additionalCostsData.reduce(
      (total, additionalCost) => total + additionalCost.amount,
      0
    );

    const totalAmount =
      itemSubtotalAmount -
      normalizedDiscountAmount +
      normalizedTaxAmount +
      totalAdditionalCostAmount;

    if (totalAmount <= 0) {
      const error = new Error("Total amount must be greater than 0");
      error.status = 400;
      throw error;
    }

    if (paidAmount > totalAmount) {
    const error = new Error("Paid amount cannot exceed total amount");
    error.status = 400;
    throw error;
  }

  const normalizedCashReceivedAmount =
    cashReceivedAmount !== undefined && cashReceivedAmount !== null
      ? cashReceivedAmount
      : paidAmount > 0
        ? paidAmount
        : null;

  if (
    normalizedCashReceivedAmount !== null &&
    normalizedCashReceivedAmount < paidAmount
  ) {
    const error = new Error("Cash received amount cannot be less than paid amount");
    error.status = 400;
    throw error;
  }

  if (
    normalizedCashReceivedAmount !== null &&
    normalizedCashReceivedAmount > 0 &&
    paidAmount <= 0
  ) {
    const error = new Error("Paid amount is required when cash received amount is greater than 0");
    error.status = 400;
    throw error;
  }

  const calculatedChangeAmount =
    normalizedCashReceivedAmount !== null
      ? normalizedCashReceivedAmount - paidAmount
      : null;

  if (
    changeAmount !== undefined &&
    changeAmount !== null &&
    changeAmount !== calculatedChangeAmount
  ) {
    const error = new Error("Change amount does not match cash received amount");
    error.status = 400;
    throw error;
  }

  const remainingAmount = totalAmount - paidAmount;
  const paymentStatus = getPaymentStatus(totalAmount, paidAmount);
  const saleNumber = generateSaleNumber();

    const isReceivable = remainingAmount > 0;
    const needsOwnerApproval =
      isReceivable &&
      operationalPreference.requireReceivableApproval &&
      createdByRole !== "OWNER";

    const saleStatus = needsOwnerApproval ? "PENDING_APPROVAL" : "COMPLETED";

    const saleDueDate = isReceivable
      ? dueDate ||
        addDays(new Date(), operationalPreference.defaultReceivableDueDays)
      : null;

    const sale = await tx.sale.create({
      data: {
        saleNumber,
        customerId,
        customerName: customerId ? customer.name : customerName,
        customerPhone: customerId ? customer.phone : customerPhone,
        customerAddress: customer?.address || customerAddress || null,
        totalAmount,
        paidAmount,
        cashReceivedAmount: normalizedCashReceivedAmount,
        changeAmount: calculatedChangeAmount,
        remainingAmount,
        discountAmount: normalizedDiscountAmount,
        taxAmount: normalizedTaxAmount,
        dueDate: saleDueDate,
        paymentStatus,
        paymentMethod,
        cashBankAccountId,
        status: saleStatus,
        note,
        createdById,
        items: {
          create: saleItemsData,
        },
        additionalCosts:
          additionalCostsData.length > 0
            ? {
                create: additionalCostsData,
              }
            : undefined,
      },
      include: {
        items: true,
        additionalCosts: true,
      },
    });

    if (saleStatus === "COMPLETED") {
      await createSaleStockHistories({
        tx,
        sale,
        items,
        createdById,
      });

      await createSaleJournal({
        tx,
        sale,
        saleItems: saleItemsData,
        cashBankAccountId,
        paymentMethod,
        createdById,
      });
    }

    return tx.sale.findUnique({
      where: {
        id: sale.id,
      },
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
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        additionalCosts: true,
        approvalHistories: true,
        receivablePayments: true,
      },
    });
  });
};

const approveSale = async ({ saleId, note, createdById }) => {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: {
        id: saleId,
      },
      include: {
        items: true,
      },
    });

    if (!sale) {
      const error = new Error("Sale not found");
      error.status = 404;
      throw error;
    }

    if (sale.status !== "PENDING_APPROVAL") {
      const error = new Error("Only pending approval sale can be approved");
      error.status = 400;
      throw error;
    }

    await createSaleStockHistories({
      tx,
      sale,
      items: sale.items,
      createdById,
    });

    await createSaleJournal({
      tx,
      sale,
      saleItems: sale.items,
      cashBankAccountId: sale.cashBankAccountId,
      paymentMethod: sale.paymentMethod,
      createdById,
    });

    await tx.sale.update({
      where: {
        id: saleId,
      },
      data: {
        status: "COMPLETED",
      },
    });

    await tx.saleApprovalHistory.create({
      data: {
        saleId,
        action: "APPROVED",
        note,
        createdById,
      },
    });

    return tx.sale.findUnique({
      where: {
        id: saleId,
      },
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
        approvalHistories: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                username: true,
                role: true,
              },
            },
          },
        },
      },
    });
  });
};

const rejectSale = async ({ saleId, note, createdById }) => {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: {
        id: saleId,
      },
    });

    if (!sale) {
      const error = new Error("Sale not found");
      error.status = 404;
      throw error;
    }

    if (sale.status !== "PENDING_APPROVAL") {
      const error = new Error("Only pending approval sale can be rejected");
      error.status = 400;
      throw error;
    }

    await tx.sale.update({
      where: {
        id: saleId,
      },
      data: {
        status: "REJECTED",
      },
    });

    await tx.saleApprovalHistory.create({
      data: {
        saleId,
        action: "REJECTED",
        note,
        createdById,
      },
    });

    return tx.sale.findUnique({
      where: {
        id: saleId,
      },
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
        approvalHistories: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                username: true,
                role: true,
              },
            },
          },
        },
      },
    });
  });
};

const paySale = async ({
  saleId,
  amount,
  paymentMethod,
  cashBankAccountId,
  note,
  createdById,
}) => {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: {
        id: saleId,
      },
    });

    if (!sale) {
      const error = new Error("Sale not found");
      error.status = 404;
      throw error;
    }

    if (sale.status !== "COMPLETED") {
      const error = new Error("Only completed sale can receive payment");
      error.status = 400;
      throw error;
    }

    if (sale.remainingAmount <= 0) {
      const error = new Error("Sale is already fully paid");
      error.status = 400;
      throw error;
    }

    if (amount > sale.remainingAmount) {
      const error = new Error("Payment amount cannot exceed remaining amount");
      error.status = 400;
      throw error;
    }

    await getCashBankAccountForPayment(tx, cashBankAccountId, paymentMethod);

    const newPaidAmount = sale.paidAmount + amount;
    const newRemainingAmount = sale.remainingAmount - amount;
    const newPaymentStatus = getPaymentStatus(sale.totalAmount, newPaidAmount);

    await tx.receivablePayment.create({
      data: {
        saleId,
        amount,
        paymentMethod,
        cashBankAccountId,
        note,
        createdById,
      },
    });

    await tx.sale.update({
      where: {
        id: saleId,
      },
      data: {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
      },
    });

    await createReceivablePaymentJournal({
      tx,
      sale,
      amount,
      paymentMethod,
      cashBankAccountId,
      createdById,
    });

    return tx.sale.findUnique({
      where: {
        id: saleId,
      },
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
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        additionalCosts: true,
        approvalHistories: {
          include: {
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
            createdAt: "desc",
          },
        },
        receivablePayments: {
          include: {
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
            createdAt: "desc",
          },
        },
      },
    });
  });
};

const padNumber = (number, length = 4) => {
  return String(number).padStart(length, "0");
};

const getYearMonth = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}${month}`;
};

const generateSalesInvoiceNumber = async ({ tx, documentSetting, date }) => {
  const prefix = documentSetting.salesInvoicePrefix;
  const yearMonth = getYearMonth(date);

  const invoicePrefix = documentSetting.resetNumberMonthly
    ? `${prefix}-${yearMonth}`
    : `${prefix}`;

  const existingInvoiceCount = await tx.sale.count({
    where: {
      invoiceNumber: {
        startsWith: invoicePrefix,
      },
    },
  });

  const nextNumber = existingInvoiceCount + 1;

  return `${invoicePrefix}-${padNumber(nextNumber)}`;
};

const getSaleInvoicePreview = async (saleId) => {
  const sale = await prisma.sale.findUnique({
    where: {
      id: saleId,
    },
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
          product: {
            include: {
              category: true,
            },
          },
        },
      },
      additionalCosts: true,
      receivablePayments: {
        include: {
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
          createdAt: "desc",
        },
      },
    },
  });

  if (!sale) {
    const error = new Error("Sale not found");
    error.status = 404;
    throw error;
  }

  if (sale.status === "REJECTED") {
    const error = new Error("Rejected sale cannot generate invoice preview");
    error.status = 400;
    throw error;
  }

  const storeProfile = await settingsService.getStoreProfile();
  const documentSetting = await settingsService.getDocumentSetting();

  const defaultInvoiceBankAccount = await prisma.cashBankAccount.findFirst({
    where: {
      type: "BANK",
      status: "ACTIVE",
      isDefaultForInvoice: true,
    },
    include: {
      account: true,
    },
  });

  const itemSubtotalAmount = sale.items.reduce((total, item) => {
    return total + item.subtotal;
  }, 0);

  const additionalCostAmount = sale.additionalCosts.reduce((total, cost) => {
    return total + cost.amount;
  }, 0);

  const calculatedTotalAmount =
    itemSubtotalAmount -
    sale.discountAmount +
    sale.taxAmount +
    additionalCostAmount;

  const paperSize = documentSetting.defaultPaperSize;
  const maxItems =
    paperSize === "F4" ? documentSetting.maxItemsF4 : documentSetting.maxItemsA4;

  const copyLabels = [
    documentSetting.copyLabel1,
    documentSetting.copyLabel2,
    documentSetting.copyLabel3,
  ]
    .slice(0, documentSetting.invoiceCopies)
    .map((label, index) => ({
      copyNumber: index + 1,
      label,
    }));

  return {
    invoice: {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      invoiceNumber: sale.invoiceNumber,
      previewNumber: sale.invoiceNumber || `DRAFT-${sale.saleNumber}`,
      invoiceDate: sale.invoiceDate,
      transactionDate: sale.createdAt,
      dueDate: sale.dueDate,
      saleStatus: sale.status,
      paymentStatus: sale.paymentStatus,
      paperSize,
      maxItems,
      invoiceCopies: documentSetting.invoiceCopies,
      copyLabels,
      isOfficialInvoice: Boolean(sale.invoiceNumber),
    },
    store: {
      name: storeProfile.name,
      legalName: storeProfile.legalName,
      brandShortName: storeProfile.brandShortName,
      address: storeProfile.address,
      phone: storeProfile.phone,
      email: storeProfile.email,
      website: storeProfile.website,
      socialMedia: storeProfile.socialMedia,
      logoUrl: storeProfile.logoUrl,
      taxNumber: storeProfile.taxNumber,
      businessNumber: storeProfile.businessNumber,
    },
    customer: {
      id: sale.customerId,
      name: sale.customer ? sale.customer.name : sale.customerName,
      phone: sale.customer ? sale.customer.phone : sale.customerPhone,
      address: sale.customer?.address || sale.customerAddress || null,
      type: sale.customer ? sale.customer.type : null,
    },
    items: sale.items.map((item, index) => ({
      no: index + 1,
      productId: item.productId,
      productCode: item.product.searchCode,
      supplierCode: item.product.supplierCode,
      productName: item.product.name,
      imageUrl: item.product.imageUrl,
      categoryName: item.product.category ? item.product.category.name : null,
      unit: item.product.unit,
      quantity: item.quantity,
      sellingPrice: item.sellingPrice,
      subtotal: item.subtotal,
    })),
    summary: {
      itemSubtotalAmount,
      discountAmount: sale.discountAmount,
      taxAmount: sale.taxAmount,
      additionalCostAmount,
      additionalCosts: sale.additionalCosts.map((cost) => ({
        id: cost.id,
        name: cost.name,
        amount: cost.amount,
        note: cost.note,
      })),
      calculatedTotalAmount,
      totalAmount: sale.totalAmount,
      isCalculationMatched: calculatedTotalAmount === sale.totalAmount,
    },
    payment: {
      paymentMethod: sale.paymentMethod,
      paidAmount: sale.paidAmount,
      cashReceivedAmount: sale.cashReceivedAmount,
      changeAmount: sale.changeAmount,
      remainingAmount: sale.remainingAmount,
      paymentStatus: sale.paymentStatus,
      cashBankAccount: sale.cashBankAccount
        ? {
            id: sale.cashBankAccount.id,
            name: sale.cashBankAccount.name,
            type: sale.cashBankAccount.type,
            bankName: sale.cashBankAccount.bankName,
            accountNumber: sale.cashBankAccount.accountNumber,
            accountHolderName: sale.cashBankAccount.accountHolderName,
          }
        : null,
      receivablePayments: sale.receivablePayments,
    },
    invoiceBankAccount: defaultInvoiceBankAccount
      ? {
          id: defaultInvoiceBankAccount.id,
          name: defaultInvoiceBankAccount.name,
          bankName: defaultInvoiceBankAccount.bankName,
          accountNumber: defaultInvoiceBankAccount.accountNumber,
          accountHolderName: defaultInvoiceBankAccount.accountHolderName,
        }
      : null,
    notes: {
      saleNote: sale.note,
      thankYouNote: documentSetting.thankYouNote,
      transactionProofNote: documentSetting.transactionProofNote,
      complaintTerms: documentSetting.complaintTerms,
      returnTerms: documentSetting.returnTerms,
      paymentTerms: documentSetting.paymentTerms,
      additionalNote: documentSetting.additionalNote,
    },
    authorization: {
      responsiblePersonName: documentSetting.responsiblePersonName,
      responsiblePersonTitle: documentSetting.responsiblePersonTitle,
      showSignature: documentSetting.showSignature,
      signatureUrl: documentSetting.signatureUrl,
      showStamp: documentSetting.showStamp,
      stampUrl: documentSetting.stampUrl,
      signatureText: documentSetting.signatureText,
    },
    createdBy: sale.createdBy,
  };
};

const generateSaleInvoice = async (saleId) => {
  const sale = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: {
        id: saleId,
      },
    });

    if (!sale) {
      const error = new Error("Sale not found");
      error.status = 404;
      throw error;
    }

    if (sale.status !== "COMPLETED") {
      const error = new Error("Only completed sale can generate invoice");
      error.status = 400;
      throw error;
    }

    if (sale.invoiceNumber) {
      const error = new Error("Invoice number already generated");
      error.status = 400;
      throw error;
    }

    const documentSetting = await tx.documentSetting.upsert({
      where: {
        key: "MAIN",
      },
      update: {},
      create: {
        key: "MAIN",
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
      },
    });

    const invoiceDate = new Date();

    const invoiceNumber = await generateSalesInvoiceNumber({
      tx,
      documentSetting,
      date: invoiceDate,
    });

    return tx.sale.update({
      where: {
        id: saleId,
      },
      data: {
        invoiceNumber,
        invoiceDate,
      },
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
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        additionalCosts: true,
        receivablePayments: true,
      },
    });
  });

  const invoicePreview = await getSaleInvoicePreview(sale.id);

  return {
    sale,
    invoicePreview,
  };
};

const generateSaleInvoicePdf = async (saleId) => {
  const invoicePreview = await getSaleInvoicePreview(saleId);

  if (!invoicePreview.invoice.isOfficialInvoice) {
    const error = new Error("Generate invoice number before creating PDF");
    error.status = 400;
    throw error;
  }

  if (invoicePreview.items.length > invoicePreview.invoice.maxItems) {
    const error = new Error(
      `Invoice item limit exceeded for ${invoicePreview.invoice.paperSize}. Maximum item is ${invoicePreview.invoice.maxItems}`
    );
    error.status = 400;
    throw error;
  }

  if (!invoicePreview.summary.isCalculationMatched) {
    const error = new Error("Invoice calculation mismatch");
    error.status = 400;
    throw error;
  }

  const pdfBuffer = await generateSaleInvoicePdfBuffer(invoicePreview);

  return {
    pdfBuffer,
    fileName: `${invoicePreview.invoice.invoiceNumber}.pdf`,
  };
};

module.exports = {
  getAllSales,
  getSaleById,
  createSale,
  approveSale,
  rejectSale,
  paySale,
  getSaleInvoicePreview,
  generateSaleInvoice,
  generateSaleInvoicePdf,
};