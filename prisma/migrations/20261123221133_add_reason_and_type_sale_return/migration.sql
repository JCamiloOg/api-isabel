/*
  Warnings:

  - You are about to drop the column `image` on the `product_colors` table. All the data in the column will be lost.
  - The `status` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `purchases` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `reason` column on the `sale_returns` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sales` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PurchasesStatus" AS ENUM ('Pendiente', 'Cancelada', 'Recibida');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('Pendiente', 'En Preparación', 'En Camino', 'Entregada', 'Cancelada');

-- CreateEnum
CREATE TYPE "TypeResolution" AS ENUM ('Cambiar por el mismo producto', 'Devolver dinero', 'Cambiar por otra referencia');

-- CreateEnum
CREATE TYPE "ReasonsReturn" AS ENUM ('Talla equivocada', 'Color equivocado', 'Producto dañado', 'Producto defectuoso', 'Producto no corresponde');

-- AlterTable
ALTER TABLE "product_colors" DROP COLUMN "image";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "image" VARCHAR(255),
DROP COLUMN "status",
ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "purchases" DROP COLUMN "status",
ADD COLUMN     "status" "PurchasesStatus" NOT NULL DEFAULT 'Pendiente';

-- AlterTable
ALTER TABLE "sale_returns" ADD COLUMN     "details" VARCHAR(255),
ADD COLUMN     "type_resolution" "TypeResolution" NOT NULL DEFAULT 'Cambiar por el mismo producto',
DROP COLUMN "reason",
ADD COLUMN     "reason" "ReasonsReturn" NOT NULL DEFAULT 'Talla equivocada';

-- AlterTable
ALTER TABLE "sales" DROP COLUMN "status",
ADD COLUMN     "status" "SaleStatus" NOT NULL DEFAULT 'Pendiente';
