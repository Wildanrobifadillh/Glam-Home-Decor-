-- CreateTable
CREATE TABLE "store_profiles" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'MAIN',
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "brand_short_name" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "social_media" TEXT,
    "logo_url" TEXT,
    "tax_number" TEXT,
    "business_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_profiles_key_key" ON "store_profiles"("key");
