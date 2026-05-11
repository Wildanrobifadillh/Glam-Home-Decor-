const prisma = require("../../config/prisma");
const {
  generateJournalEntryNumber,
} = require("../../utils/generateJournalEntryNumber");
const {
  createJournalEntryWithLines,
} = require("../../utils/accountingJournal");

const getJournalEntryInclude = () => ({
  createdBy: {
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
    },
  },
  reversalOf: {
    select: {
      id: true,
      entryNumber: true,
      sourceType: true,
      status: true,
    },
  },
  reversedBy: {
    select: {
      id: true,
      entryNumber: true,
      sourceType: true,
      status: true,
    },
  },
  lines: {
    include: {
      account: true,
    },
  },
});

const getAllJournalEntries = async () => {
  return prisma.journalEntry.findMany({
    include: getJournalEntryInclude(),
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getJournalEntryById = async (id) => {
  const journalEntry = await prisma.journalEntry.findUnique({
    where: {
      id,
    },
    include: getJournalEntryInclude(),
  });

  if (!journalEntry) {
    const error = new Error("Journal entry not found");
    error.status = 404;
    throw error;
  }

  return journalEntry;
};

const validateAccounts = async (tx, lines) => {
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

const createJournalEntry = async ({
  entryDate,
  description,
  sourceType,
  sourceId,
  lines,
  createdById,
}) => {
  return prisma.$transaction(async (tx) => {
    await validateAccounts(tx, lines);

    const totalDebit = lines.reduce((total, line) => total + line.debit, 0);
    const totalCredit = lines.reduce((total, line) => total + line.credit, 0);

    if (totalDebit !== totalCredit) {
      const error = new Error("Total debit and credit must be balanced");
      error.status = 400;
      throw error;
    }

    await updateCashBankBalances(tx, lines);

    const entryNumber = generateJournalEntryNumber();

    const journalEntry = await tx.journalEntry.create({
      data: {
        entryNumber,
        entryDate,
        description,
        sourceType,
        sourceId,
        createdById,
        lines: {
          create: lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            note: line.note,
          })),
        },
      },
    });

    return tx.journalEntry.findUnique({
      where: {
        id: journalEntry.id,
      },
      include: getJournalEntryInclude(),
    });
  });
};

const reverseJournalEntry = async ({ journalEntryId, note, createdById }) => {
  return prisma.$transaction(async (tx) => {
    const originalJournalEntry = await tx.journalEntry.findUnique({
      where: {
        id: journalEntryId,
      },
      include: {
        reversedBy: true,
        lines: true,
      },
    });

    if (!originalJournalEntry) {
      const error = new Error("Journal entry not found");
      error.status = 404;
      throw error;
    }

    if (originalJournalEntry.status !== "POSTED") {
      const error = new Error("Only posted journal entry can be reversed");
      error.status = 400;
      throw error;
    }

    if (originalJournalEntry.sourceType === "REVERSAL") {
      const error = new Error("Reversal journal cannot be reversed");
      error.status = 400;
      throw error;
    }

    if (originalJournalEntry.reversedBy) {
      const error = new Error("Journal entry has already been reversed");
      error.status = 400;
      throw error;
    }

    const reversalLines = originalJournalEntry.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit,
      note: `Reversal of ${originalJournalEntry.entryNumber}`,
    }));

    const reversalJournalEntry = await createJournalEntryWithLines({
      tx,
      description: note
        ? `Reversal of ${originalJournalEntry.entryNumber} - ${note}`
        : `Reversal of ${originalJournalEntry.entryNumber}`,
      sourceType: "REVERSAL",
      sourceId: originalJournalEntry.id,
      reversalOfId: originalJournalEntry.id,
      lines: reversalLines,
      createdById,
    });

    await tx.journalEntry.update({
      where: {
        id: journalEntryId,
      },
      data: {
        status: "CANCELLED",
      },
    });

    return tx.journalEntry.findUnique({
      where: {
        id: reversalJournalEntry.id,
      },
      include: getJournalEntryInclude(),
    });
  });
};

module.exports = {
  getAllJournalEntries,
  getJournalEntryById,
  createJournalEntry,
  reverseJournalEntry,
};