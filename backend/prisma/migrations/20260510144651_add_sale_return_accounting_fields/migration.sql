-- AlterTable
ALTER TABLE "sale_returns" ADD COLUMN     "cash_bank_account_id" UUID,
ADD COLUMN     "payment_method" "PaymentMethod",
ADD COLUMN     "receivable_reduction_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refund_amount" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_cash_bank_account_id_fkey" FOREIGN KEY ("cash_bank_account_id") REFERENCES "cash_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
