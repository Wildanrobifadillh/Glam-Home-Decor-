-- CreateTable
CREATE TABLE "operational_preferences" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'MAIN',
    "default_receivable_due_days" INTEGER NOT NULL DEFAULT 7,
    "default_payable_due_days" INTEGER NOT NULL DEFAULT 14,
    "default_payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "default_cash_bank_account_id" UUID,
    "require_receivable_approval" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operational_preferences_key_key" ON "operational_preferences"("key");
