/*
  Warnings:

  - The `status` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "purchases" ALTER COLUMN "status" SET DEFAULT 'Pendiente';

-- AlterTable
ALTER TABLE "sale_returns" ALTER COLUMN "status" SET DEFAULT 'Pendiente';

-- AlterTable
ALTER TABLE "sales" ALTER COLUMN "status" SET DEFAULT 'Pendiente';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "status",
ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT true;
