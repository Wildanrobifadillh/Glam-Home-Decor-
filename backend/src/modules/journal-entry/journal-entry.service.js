const prisma = require("../../config/prisma");
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

const createJournalEntry = async ({
  entryDate,
  description,
  lines,
  createdById,
}) => {
  return prisma.$transaction(async (tx) => {
    const createdJournalEntry = await createJournalEntryWithLines({
      tx,
      entryDate,
      description,
      sourceType: "MANUAL",
      sourceId: null,
      reversalOfId: null,
      lines,
      createdById,
    });

    return tx.journalEntry.findUnique({
      where: {
        id: createdJournalEntry.id,
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