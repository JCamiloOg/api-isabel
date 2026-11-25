import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";
import { Prisma, ReasonsReturn, TypeResolution } from "@prisma/client";
import { AppError } from "../../../config/appError.js";


type SaleReturnByIDPayload = Prisma.SaleGetPayload<{
    select: {
        id: true,
        seller: true,
        customer: true,
        saleReturns: {
            include: {
                user: true,
                variant: {
                    include: {
                        size: true,
                        productColor: {
                            include: {
                                color: true,
                                product: {
                                    select: {
                                        name: true,
                                        sku: true,
                                        image: true,
                                        id: true
                                    }
                                },
                            }
                        }
                    }
                }
            }
        }
    }
}
>

type SaleReturnsPayload = {
    id: string;
    lastRequestDate: Date;
    totalReturns: number;
    pendingReturns: number;
}

export const getSalesReturns: RequestHandler<
    { idSale: string; },
    { message: string, saleReturns?: SaleReturnsPayload[] | SaleReturnByIDPayload }
> = async (req, res, next) => {
    try {
        const { idSale } = req.params;

        if (idSale) {
            const saleReturn = await prisma.sale.findUnique({
                select: {
                    id: true,
                    seller: true,
                    customer: true,
                    saleReturns: {
                        include: {
                            user: true,
                            exchangeItems: {
                                include: {
                                    variant: {
                                        include: {
                                            size: true,
                                            productColor: {
                                                include: {
                                                    color: true,
                                                    product: {
                                                        select: {
                                                            name: true,
                                                            image: true,
                                                            sku: true,
                                                            id: true
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            variant: {
                                include: {
                                    size: true,
                                    productColor: {
                                        include: {
                                            color: true,
                                            product: {
                                                select: {
                                                    name: true,
                                                    image: true,
                                                    sku: true,
                                                    id: true
                                                }
                                            },
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                where: { id: idSale }
            });

            if (!saleReturn) return res.status(404).json({ message: "Devolución no encontrada." });

            return res.status(200).json({
                message: "Devolución obtenida exitosamente.",
                saleReturns: saleReturn
            });
        }

        const saleReturns = await prisma.saleReturn.findMany({
            distinct: ["saleId"],
            orderBy: {
                requestDate: "desc"
            },
            include: {
                sale: {
                    select: {
                        id: true,
                        saleReturns: {
                            select: {
                                status: true
                            }
                        }
                    }
                }
            }
        });



        const saleReturnsOrdened = saleReturns.map((s) => ({
            id: s.sale.id,
            lastRequestDate: s.requestDate,
            totalReturns: s.sale.saleReturns.length,
            pendingReturns: s.sale.saleReturns.filter((r) => r.status === "Pendiente").length
        }));

        return res.status(200).json({
            message: "Devoluciones obtenidas existosamente.",
            saleReturns: saleReturnsOrdened
        });

    } catch (AppError) {
        next(AppError);
    }
};

interface ExchangeItemInput {
    variantId: number;
    quantity: number;
    unitPrice?: number; // Opcional: si no se envía, toma el precio actual del producto
}

interface CreateSaleReturnItemInput {
    saleId: string;
    variantId: number;
    quantity: number;
    reason: ReasonsReturn;
    details?: string;
    typeResolution: TypeResolution;
    returnToStock?: boolean;
    exchangeItems?: ExchangeItemInput[];
}

export const createSaleReturn: RequestHandler<
    unknown,
    { message: string },
    { items: CreateSaleReturnItemInput[] }
> = async (req, res, next) => {
    try {
        const { items } = req.body;
        const userId = "1017100001"; // Idealmente desde tu middleware auth

        if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Debes enviar al menos un ítem a devolver." });


        const createdReturns = await prisma.$transaction(async (tx) => {
            const results: { id: string }[] = [];

            for (const item of items) {
                if (item.quantity <= 0) throw new AppError("La cantidad a devolver debe ser mayor a 0.", 400);


                // 1. Buscar la venta y el detalle del producto comprado
                const sale = await tx.sale.findUnique({
                    where: { id: item.saleId },
                    include: {
                        saleDetails: { where: { variantId: item.variantId } },
                        saleReturns: {
                            where: {
                                variantId: item.variantId,
                                status: { in: ["Pendiente", "Aprobada"] },
                            },
                        },
                    },
                });

                if (!sale) throw new AppError(`La venta ${item.saleId} no existe.`, 400);


                const saleDetail = sale.saleDetails[0];
                if (!saleDetail) throw new AppError(`La variante ${item.variantId} no pertenece a la venta.`, 400);


                // 2. Validar que no se exceda la cantidad comprada menos devoluciones previas
                const alreadyReturned = sale.saleReturns.reduce((acc, r) => acc + r.quantity, 0);
                const availableToReturn = saleDetail.quantity - alreadyReturned;

                if (item.quantity > availableToReturn) throw new AppError(`Solo puedes devolver máximo ${availableToReturn} unidad(es) de la variante ${item.variantId}.`, 400);

                // 3. Calcular el monto neto pagado por unidad (con descuento e IVA de la venta)
                const discountFactor = new Prisma.Decimal(1).minus(
                    new Prisma.Decimal(sale.discount).div(100)
                );
                const vatFactor = new Prisma.Decimal(1).plus(
                    new Prisma.Decimal(sale.vat).div(100)
                );
                const netUnitPrice = new Prisma.Decimal(saleDetail.unitPrice)
                    .mul(discountFactor)
                    .mul(vatFactor)
                    .toDecimalPlaces(2);

                const refundAmount = netUnitPrice.mul(item.quantity).toDecimalPlaces(2);

                // 4. Determinar si vuelve a inventario vendible según el motivo
                const isDamaged = item.reason === "Producto_dañado" || item.reason === "Producto_defectuoso";
                const returnToStock = item.returnToStock ?? !isDamaged;

                // 5. Validar ítems de cambio si la resolución no es devolver dinero
                if (item.typeResolution === "Cambiar_otra_referencia") {
                    if (!item.exchangeItems || item.exchangeItems.length === 0) throw new AppError(`Debes indicar los productos de cambio para la resolución ${item.typeResolution}.`, 400);
                }

                // 6. Crear encabezado de devolución en estado Pendiente
                const createdReturn = await tx.saleReturn.create({
                    data: {
                        saleId: item.saleId,
                        variantId: item.variantId,
                        userId,
                        quantity: item.quantity,
                        refundAmount,
                        returnToStock,
                        reason: item.reason,
                        details: item.details,
                        typeResolution: item.typeResolution,
                        status: "Pendiente",
                    },
                });

                // 7. Si hay productos de cambio, registrar SaleReturnExchange
                if (item.typeResolution !== "Devolver_dinero" && item.exchangeItems?.length) {
                    const exchangeData = await Promise.all(
                        item.exchangeItems.map(async (ex) => {
                            // Si es cambio por el mismo producto (ej. otra talla), conservamos el precio neto pagado
                            // para que el saldo neto sea $0 aunque el catálogo haya subido de precio.
                            if (item.typeResolution === "Cambiar_mismo_producto") {
                                return {
                                    saleReturnId: createdReturn.id,
                                    variantId: ex.variantId,
                                    quantity: ex.quantity,
                                    unitPrice: netUnitPrice,
                                };
                            }

                            // Si es otra referencia, usamos el unitPrice enviado o el precio actual del producto
                            let unitPrice = ex.unitPrice ? new Prisma.Decimal(ex.unitPrice) : null;
                            if (!unitPrice) {
                                const variant = await tx.productVariant.findUnique({
                                    where: { id: ex.variantId },
                                    include: { productColor: { include: { product: true } } },
                                });
                                if (!variant) throw new AppError(`La variante de cambio ${ex.variantId} no existe.`, 400);
                                unitPrice = new Prisma.Decimal(variant.productColor.product.salePrice);
                            }

                            return {
                                saleReturnId: createdReturn.id,
                                variantId: ex.variantId,
                                quantity: ex.quantity,
                                unitPrice,
                            };
                        })
                    );

                    await tx.saleReturnExchange.createMany({ data: exchangeData });
                }

                results.push({ id: createdReturn.id });
            }

            return results;
        });

        const shortSaleId = items[0].saleId.split("-")[0];
        const message =
            createdReturns.length === 1
                ? `Devolución de la venta ${shortSaleId}... creada exitosamente.`
                : `Devoluciones de la venta ${shortSaleId}... creadas exitosamente.`;

        return res.status(201).json({ message, });
    } catch (AppError) {
        next(AppError);
    }
};


interface ReturnPaymentInput {
    cashRegisterId: number;
    paymentMethodId: number;
    amount: number;
    receipt?: string;
    notes?: string;
}

type ResolveSaleReturnBody =
    | {
        status: "Rechazada";
        rejectionReason: string;
    }
    | {
        status: "Aprobada";
        returnToStock?: boolean;
        payments?: ReturnPaymentInput[];
    };

export const resolveSaleReturn: RequestHandler<
    { idSaleReturn: string },
    { message: string },
    ResolveSaleReturnBody
> = async (req, res, next) => {
    try {
        const { idSaleReturn } = req.params;
        const body = req.body;
        const userId = "1017100001";

        if (body.status !== "Aprobada" && body.status !== "Rechazada") {
            return res.status(400).json({
                message: "El estado de resolución debe ser 'Aprobada' o 'Rechazada'.",
            });
        }

        // ------------------------------------------------------------------------
        // CASO 1: RECHAZAR DEVOLUCIÓN (Solo actualiza estado, motivo y fecha)
        // ------------------------------------------------------------------------
        if (body.status === "Rechazada") {
            const reason = body.rejectionReason?.trim();

            if (!reason) {
                return res.status(400).json({
                    message: "Debes proporcionar un motivo de rechazo (rejectionReason).",
                });
            }

            if (reason.length > 255) {
                return res.status(400).json({
                    message: "El motivo de rechazo no puede superar los 255 caracteres.",
                });
            }

            const saleReturn = await prisma.saleReturn.findUnique({ where: { id: idSaleReturn } });

            if (!saleReturn) {
                return res.status(404).json({ message: "La solicitud de devolución no existe." });
            }
            if (saleReturn.status !== "Pendiente") {
                return res.status(400).json({
                    message: `La devolución ya fue resuelta previamente con estado: ${saleReturn.status}.`,
                });
            }

            await prisma.saleReturn.update({
                where: { id: idSaleReturn },
                data: {
                    status: "Rechazada",
                    rejectionReason: reason,
                    resolutionDate: new Date(),
                },
            });

            return res.status(200).json({
                message: "Solicitud de devolución rechazada correctamente.",
            });
        }

        // ------------------------------------------------------------------------
        // CASO 2: APROBAR DEVOLUCIÓN (Actualiza inventario, pagos y saldos de caja)
        // ------------------------------------------------------------------------
        const { returnToStock: overrideReturnToStock, payments = [] } = body;

        await prisma.$transaction(async (tx) => {
            const saleReturn = await tx.saleReturn.findUnique({
                where: { id: idSaleReturn },
                include: { exchangeItems: true },
            });

            if (!saleReturn) {
                throw new Error("La solicitud de devolución no existe.");
            }
            if (saleReturn.status !== "Pendiente") {
                throw new Error(`La devolución ya fue procesada con estado: ${saleReturn.status}.`);
            }

            const finalReturnToStock = overrideReturnToStock ?? saleReturn.returnToStock;

            // 1. Inventario entrada (solo si el producto está en condiciones de volver a venderse)
            if (finalReturnToStock) {
                await tx.productVariant.update({
                    where: { id: saleReturn.variantId },
                    data: { currentStock: { increment: saleReturn.quantity } },
                });
            }

            // 2. Inventario salida (descontar variantes entregadas a cambio)
            let totalExchangeValue = new Prisma.Decimal(0);

            if (saleReturn.typeResolution !== "Devolver_dinero") {
                if (saleReturn.exchangeItems.length === 0) {
                    throw new Error("No hay productos de cambio asociados a esta devolución.");
                }

                for (const exItem of saleReturn.exchangeItems) {
                    const variant = await tx.productVariant.findUnique({
                        where: { id: exItem.variantId },
                    });

                    if (!variant || variant.currentStock < exItem.quantity) {
                        throw new Error(
                            `Stock insuficiente para la variante de cambio ID ${exItem.variantId}.`
                        );
                    }

                    await tx.productVariant.update({
                        where: { id: exItem.variantId },
                        data: { currentStock: { decrement: exItem.quantity } },
                    });

                    const lineTotal = new Prisma.Decimal(exItem.unitPrice).mul(exItem.quantity);
                    totalExchangeValue = totalExchangeValue.plus(lineTotal);
                }
            }

            // 3. Liquidación financiera (diferencia entre lo entregado y refundAmount)
            const refundAmount = new Prisma.Decimal(saleReturn.refundAmount);
            const netDifference = totalExchangeValue.minus(refundAmount).toDecimalPlaces(2);

            const totalPaymentsSent = payments
                .reduce((acc, p) => acc.plus(new Prisma.Decimal(p.amount)), new Prisma.Decimal(0))
                .toDecimalPlaces(2);

            if (netDifference.equals(0)) {
                if (!totalPaymentsSent.equals(0)) {
                    throw new AppError("Esta resolución no tiene diferencia de dinero; no envíes pagos.",);
                }
            } else {
                const expectedAmount = netDifference.abs();
                const paymentType = netDifference.greaterThan(0) ? "Ingreso" : "Egreso";

                if (!totalPaymentsSent.equals(expectedAmount)) {
                    throw new Error(
                        `El total de pagos (${totalPaymentsSent}) debe coincidir con el monto a ${paymentType === "Ingreso" ? "cobrar" : "devolver"
                        } (${expectedAmount}).`
                    );
                }

                for (const pay of payments) {
                    if (pay.amount <= 0) {
                        throw new Error("Cada movimiento de pago debe ser mayor a 0.");
                    }

                    const cashRegister = await tx.cashRegister.findUnique({
                        where: { id: pay.cashRegisterId },
                    });

                    if (!cashRegister || !cashRegister.status) {
                        throw new Error(`La caja ID ${pay.cashRegisterId} no existe o está inactiva.`);
                    }

                    const payAmount = new Prisma.Decimal(pay.amount);

                    if (
                        paymentType === "Egreso" &&
                        new Prisma.Decimal(cashRegister.currentBalance).lessThan(payAmount)
                    ) {
                        throw new Error(
                            `Saldo insuficiente en la caja "${cashRegister.name}" para realizar el egreso.`
                        );
                    }

                    await tx.payment.create({
                        data: {
                            saleId: saleReturn.saleId,
                            saleReturnId: saleReturn.id,
                            cashRegisterId: pay.cashRegisterId,
                            paymentMethodId: pay.paymentMethodId,
                            userId,
                            type: paymentType,
                            amount: payAmount,
                            receipt: pay.receipt,
                            notes: pay.notes ?? `Resolución devolución (${saleReturn.typeResolution})`,
                        },
                    });

                    await tx.cashRegister.update({
                        where: { id: pay.cashRegisterId },
                        data: {
                            currentBalance:
                                paymentType === "Ingreso"
                                    ? { increment: payAmount }
                                    : { decrement: payAmount },
                        },
                    });
                }
            }

            // 4. Actualizar estado final de la devolución
            await tx.saleReturn.update({
                where: { id: saleReturn.id },
                data: {
                    status: "Aprobada",
                    returnToStock: finalReturnToStock,
                    resolutionDate: new Date(),
                },
            });
        });

        return res.status(200).json({
            message: "Devolución aprobada, inventario y saldos de caja actualizados.",
        });
    } catch (error) {
        next(error);
    }
};


export const getSales: RequestHandler<
    unknown,
    unknown,
    unknown,
    { search: string; }
> = async (req, res, next) => {
    try {
        const { search } = req.query;

        const sales = await prisma.sale.findMany({
            select: {
                id: true,
                customer: {
                    select: {
                        identityDocument: true,
                        firstName: true,
                        lastName: true,
                    }
                },
                saleDetails: {
                    select: {
                        quantity: true,
                        variant: {
                            select: {
                                id: true,
                                productColor: {
                                    select: {
                                        colorImages: true,
                                        color: true,
                                        product: {
                                            select: {
                                                name: true,
                                                sku: true,
                                            }
                                        }
                                    }
                                },

                            }
                        }
                    }
                },
                _count: true,
            },
            where: {
                OR: [
                    { id: search },
                    {
                        customer: {
                            firstName: { contains: search }
                        }
                    },
                    {
                        customer: {
                            lastName: { contains: search }
                        }
                    },
                    {
                        customerId: { contains: search }
                    }
                ]
            }
        });

        return res.status(200).json({
            sales
        });
    } catch (AppError) {
        next(AppError);
    }
};

