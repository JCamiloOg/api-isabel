/*
  Warnings:

  - The `status` column on the `sale_returns` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SaleReturnStatus" AS ENUM ('Pendiente', 'Aprobada', 'Rechazada');

-- AlterTable
ALTER TABLE "sale_returns" DROP COLUMN "status",
ADD COLUMN     "status" "SaleReturnStatus" NOT NULL DEFAULT 'Pendiente';
