/*
  Warnings:

  - The `status` column on the `brands` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "typePayment" AS ENUM ('Egreso', 'Ingreso');

-- AlterTable
ALTER TABLE "brands" DROP COLUMN "status",
ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "sale_return_id" UUID,
ADD COLUMN     "type" "typePayment" NOT NULL DEFAULT 'Ingreso';

-- AlterTable
ALTER TABLE "sale_returns" ADD COLUMN     "refund_amount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "return_to_stock" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "purchase_payments" (
    "id" SERIAL NOT NULL,
    "purchase_id" UUID NOT NULL,
    "cash_register_id" INTEGER NOT NULL,
    "user_id" VARCHAR(20) NOT NULL,
    "payment_method_id" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "receipt" VARCHAR(255),
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" VARCHAR(255),

    CONSTRAINT "purchase_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_return_exchanges" (
    "id" SERIAL NOT NULL,
    "sale_return_id" UUID NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "sale_return_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sale_return_exchanges_sale_return_id_variant_id_key" ON "sale_return_exchanges"("sale_return_id", "variant_id");

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("identity_document") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_return_id_fkey" FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_exchanges" ADD CONSTRAINT "sale_return_exchanges_sale_return_id_fkey" FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_return_exchanges" ADD CONSTRAINT "sale_return_exchanges_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
