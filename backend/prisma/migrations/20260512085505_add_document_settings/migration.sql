-- CreateTable
CREATE TABLE "document_settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'MAIN',
    "document_language" TEXT NOT NULL DEFAULT 'ID',
    "sales_invoice_prefix" TEXT NOT NULL,
    "sales_return_prefix" TEXT NOT NULL,
    "purchase_return_prefix" TEXT NOT NULL,
    "payroll_slip_prefix" TEXT NOT NULL,
    "report_prefix" TEXT NOT NULL,
    "delivery_order_prefix" TEXT,
    "reset_number_monthly" BOOLEAN NOT NULL DEFAULT true,
    "default_paper_size" TEXT NOT NULL DEFAULT 'F4',
    "alternate_paper_size" TEXT NOT NULL DEFAULT 'A4',
    "invoice_copies" INTEGER NOT NULL DEFAULT 3,
    "max_items_f4" INTEGER NOT NULL DEFAULT 12,
    "max_items_a4" INTEGER NOT NULL DEFAULT 8,
    "copy_label_1" TEXT NOT NULL,
    "copy_label_2" TEXT NOT NULL,
    "copy_label_3" TEXT NOT NULL,
    "thank_you_note" TEXT,
    "transaction_proof_note" TEXT,
    "complaint_terms" TEXT,
    "return_terms" TEXT,
    "payment_terms" TEXT,
    "additional_note" TEXT,
    "responsible_person_name" TEXT NOT NULL,
    "responsible_person_title" TEXT NOT NULL,
    "show_signature" BOOLEAN NOT NULL DEFAULT true,
    "signature_url" TEXT,
    "show_stamp" BOOLEAN NOT NULL DEFAULT true,
    "stamp_url" TEXT,
    "signature_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_settings_key_key" ON "document_settings"("key");
