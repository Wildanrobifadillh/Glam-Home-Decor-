-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE');

-- CreateEnum
CREATE TYPE "NormalBalance" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "CashBankType" AS ENUM ('CASH', 'BANK');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JournalSourceType" AS ENUM ('MANUAL', 'SALE', 'PURCHASE', 'RECEIVABLE_PAYMENT', 'PAYABLE_PAYMENT', 'EXPENSE', 'PAYROLL', 'SALE_RETURN', 'PURCHASE_RETURN', 'STOCK_OPNAME');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "normal_balance" "NormalBalance" NOT NULL,
    "parent_id" UUID,
    "status" "MasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_bank_accounts" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CashBankType" NOT NULL,
    "bank_name" TEXT,
    "account_number" TEXT,
    "current_balance" INTEGER NOT NULL DEFAULT 0,
    "status" "MasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL,
    "entry_number" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "source_type" "JournalSourceType" NOT NULL DEFAULT 'MANUAL',
    "source_id" UUID,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'POSTED',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" UUID NOT NULL,
    "journal_entry_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "debit" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_code_key" ON "accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_entry_number_key" ON "journal_entries"("entry_number");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_bank_accounts" ADD CONSTRAINT "cash_bank_accounts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
