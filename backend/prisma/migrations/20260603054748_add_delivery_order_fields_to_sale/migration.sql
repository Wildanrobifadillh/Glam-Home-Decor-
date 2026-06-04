/*
  Warnings:

  - A unique constraint covering the columns `[delivery_order_number]` on the table `sales` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "delivery_order_date" TIMESTAMP(3),
ADD COLUMN     "delivery_order_number" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_delivery_order_number_key" ON "sales"("delivery_order_number");
