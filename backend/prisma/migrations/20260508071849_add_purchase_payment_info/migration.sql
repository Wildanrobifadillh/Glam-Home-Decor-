-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "paid_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
ADD COLUMN     "remaining_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "supplier_invoice_number" TEXT;
