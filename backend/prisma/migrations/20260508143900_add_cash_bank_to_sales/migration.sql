-- AlterTable
ALTER TABLE "receivable_payments" ADD COLUMN     "cash_bank_account_id" UUID;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "cash_bank_account_id" UUID;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cash_bank_account_id_fkey" FOREIGN KEY ("cash_bank_account_id") REFERENCES "cash_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_cash_bank_account_id_fkey" FOREIGN KEY ("cash_bank_account_id") REFERENCES "cash_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
