/*
  Warnings:

  - A unique constraint covering the columns `[reversal_of_id]` on the table `journal_entries` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "JournalSourceType" ADD VALUE 'REVERSAL';

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "reversal_of_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_reversal_of_id_key" ON "journal_entries"("reversal_of_id");

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
