/*
  Warnings:

  - You are about to drop the column `cash_register_id` on the `purchases` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_cash_register_id_fkey";

-- AlterTable
ALTER TABLE "purchases" DROP COLUMN "cash_register_id",
ADD COLUMN     "cashRegisterId" INTEGER;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "cash_registers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
