const journalEntryService = require("./journal-entry.service");
const {
  createJournalEntrySchema,
  reverseJournalEntrySchema,
} = require("./journal-entry.validation");

const getAllJournalEntries = async (req, res, next) => {
  try {
    const journalEntries = await journalEntryService.getAllJournalEntries();

    return res.status(200).json({
      success: true,
      message: "Journal entries retrieved successfully",
      data: {
        journalEntries,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getJournalEntryById = async (req, res, next) => {
  try {
    const journalEntry = await journalEntryService.getJournalEntryById(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Journal entry retrieved successfully",
      data: {
        journalEntry,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createJournalEntry = async (req, res, next) => {
  try {
    const validatedData = createJournalEntrySchema.parse(req.body);

    const journalEntry = await journalEntryService.createJournalEntry({
      ...validatedData,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Journal entry created successfully",
      data: {
        journalEntry,
      },
    });
  } catch (error) {
    next(error);
  }
};

const reverseJournalEntry = async (req, res, next) => {
  try {
    const validatedData = reverseJournalEntrySchema.parse(req.body);

    const journalEntry = await journalEntryService.reverseJournalEntry({
      journalEntryId: req.params.id,
      note: validatedData.note,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Journal entry reversed successfully",
      data: {
        journalEntry,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllJournalEntries,
  getJournalEntryById,
  createJournalEntry,
  reverseJournalEntry,
};