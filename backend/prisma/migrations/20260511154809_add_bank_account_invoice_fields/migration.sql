-- AlterTable
ALTER TABLE "cash_bank_accounts" ADD COLUMN     "account_holder_name" TEXT,
ADD COLUMN     "is_default_for_invoice" BOOLEAN NOT NULL DEFAULT false;
