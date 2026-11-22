import { AppError } from "../config/appError.js";
import { prisma } from "../config/prisma.js";

export async function getTotalSale(id: string, iva?: number) {
    const sale = await prisma.sale.findUnique({
        select: {
            saleDetails: {
                select: {
                    quantity: true,
                    unitPrice: true,
                }
            }
        },
        where: { id }
    });

    if (!sale) throw new AppError("Compra no encotrada", 404);

    const total = sale.saleDetails.reduce((acc, { quantity, unitPrice }) => {
        const subtotal = unitPrice.mul(quantity);
        return acc = + Number(subtotal);
    }, 0);

    if (iva) return total + (total * iva / 100);

    return total;
}