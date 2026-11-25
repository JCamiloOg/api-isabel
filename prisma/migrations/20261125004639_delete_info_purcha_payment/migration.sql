/*
  Warnings:

  - You are about to drop the column `notes` on the `purchase_payments` table. All the data in the column will be lost.
  - You are about to drop the column `payment_date` on the `purchase_payments` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method_id` on the `purchase_payments` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `purchase_payments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "purchase_payments" DROP CONSTRAINT "purchase_payments_payment_method_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_payments" DROP CONSTRAINT "purchase_payments_user_id_fkey";

-- AlterTable
ALTER TABLE "purchase_payments" DROP COLUMN "notes",
DROP COLUMN "payment_date",
DROP COLUMN "payment_method_id",
DROP COLUMN "user_id";
