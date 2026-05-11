const express = require("express");

const journalEntryController = require("./journal-entry.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorizeRoles } = require("../../middlewares/role.middleware");

const router = express.Router();

router.get("/", authenticate, journalEntryController.getAllJournalEntries);

router.post(
  "/",
  authenticate,
  authorizeRoles("OWNER"),
  journalEntryController.createJournalEntry
);

router.post(
  "/:id/reverse",
  authenticate,
  authorizeRoles("OWNER"),
  journalEntryController.reverseJournalEntry
);

router.get("/:id", authenticate, journalEntryController.getJournalEntryById);

module.exports = router;