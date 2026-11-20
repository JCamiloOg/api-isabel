/*
  Warnings:

  - A unique constraint covering the columns `[purchase_id,variant_id]` on the table `purchase_details` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "purchase_details_purchase_id_variant_id_key" ON "purchase_details"("purchase_id", "variant_id");
