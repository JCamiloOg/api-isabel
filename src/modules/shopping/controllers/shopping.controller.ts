import { CashRegister, Prisma, Purchase, PurchaseDetail, PurchasePayment, PurchasesStatus } from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";


type GetShoppingByID = Prisma.PurchaseGetPayload<
    {
        select: {
            id: true,
            supplier: true,
            status: true,
            deliveryDate: true,
            orderDate: true,
            vat: true,
            purchasePayments: {
                include: {
                    cashRegister: true,
                }
            },
            purchaseDetails: {
                select: {
                    unitPrice: true,
                    quantity: true,
                    variantId: true,
                    variant: {
                        select: {
                            currentStock: true,
                            size: true,
                            productColor: {
                                select: {
                                    colorImages: true,
                                    color: true,
                                    product: {
                                        select: {
                                            name: true,
                                            sku: true,
                                            gender: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
    }
>;

type GetShopping = Prisma.PurchaseGetPayload<
    {
        select: {
            id: true,
            supplier: true,
            status: true,
            deliveryDate: true,
            orderDate: true,
            vat: true,
        },
    }>

export const getShoppings: RequestHandler<
    { idShopping?: string; },
    {
        message: string,
        shoppings?: GetShopping[] | GetShoppingByID,
        cashRegister?: Pick<CashRegister, "id" | "name" | "currentBalance">[]
    }
> = async (req, res, next) => {
    try {
        const { idShopping } = req.params;

        if (idShopping) {
            const shopping = await prisma.purchase.findUnique({
                select: {
                    id: true,
                    supplier: true,
                    status: true,
                    deliveryDate: true,
                    vat: true,
                    orderDate: true,
                    purchasePayments: {
                        include: {
                            cashRegister: true,
                        }
                    },
                    purchaseDetails: {
                        select: {
                            id: true,
                            unitPrice: true,
                            quantity: true,
                            variantId: true,
                            variant: {
                                select: {
                                    currentStock: true,
                                    size: true,
                                    productColor: {
                                        select: {
                                            colorImages: true,
                                            color: true,
                                            product: {
                                                select: {
                                                    name: true,
                                                    sku: true,
                                                    gender: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                where: { id: idShopping }
            });

            if (!shopping) return res.status(404).json({ message: "No se ha encontrado la compra." });

            return res.status(200).json({ message: "Compra obtenida exitosamente", shoppings: shopping });
        }

        const shoppings = await prisma.purchase.findMany({
            select: {
                id: true,
                supplier: true,
                status: true,
                deliveryDate: true,
                orderDate: true,
                vat: true,
            },
            orderBy: {
                orderDate: "desc"
            }
        });
        const cashRegister = await prisma.cashRegister.findMany({
            select: {
                name: true,
                id: true,
                currentBalance: true,
            },
            where: { status: true }
        });

        return res.status(200).json({
            message: "Compras obtenidas exitosamente",
            shoppings: shoppings,
            cashRegister: cashRegister
        });

    } catch (error) {
        next(error);
    }
};

export const createShopping: RequestHandler<
    unknown,
    { message: string },
    {
        purchaseInfo: Omit<Purchase, 'status' | 'deliveryDate'>,
        purchaseDetails: Omit<PurchaseDetail, 'id' | "purchaseId">[]
        purchasePayments: Omit<PurchasePayment, "id" | "purchaseId" | "userId">[]

    }
> = async (req, res, next) => {
    try {
        const { purchaseInfo, purchaseDetails, purchasePayments } = req.body;


        if (purchaseDetails.length === 0 || !purchaseInfo) return res.status(400).json({
            message: "Campos por llenar"
        });

        if (purchaseInfo.id.trim()) {
            const existShoppingId = await prisma.purchase.findUnique({
                where: { id: purchaseInfo.id },
            });

            if (existShoppingId) return res.status(400).json({
                message: "El # de la factura ya existe. Ingresa otro o modifica la compra existente."
            });
        }
        await prisma.$transaction(async (tx) => {
            const insertedPurchase = await tx.purchase.create({
                data: {
                    ...purchaseInfo,
                    id: purchaseInfo?.id?.trim() || undefined,
                    orderDate: new Date(purchaseInfo.orderDate)
                }
            });

            await tx.purchasePayment.createMany({
                data: purchasePayments.map((p) => ({
                    ...p,
                    purchaseId: insertedPurchase.id,
                }))
            });

            await tx.purchaseDetail.createMany({
                data: purchaseDetails.map((e) => ({
                    purchaseId: insertedPurchase.id,
                    ...e
                }))
            });
        });


        return res.status(201).json({
            message: "Compra registrada exitosamente"
        });
    } catch (error) {
        next(error);
    }
};


export const updateShoppingInfo: RequestHandler<
    { idShopping: string },
    { message: string },
    { purchaseInfo: Omit<Purchase, "id" | "status" | "deliveryDate"> }
> = async (req, res, next) => {
    try {
        const { idShopping } = req.params;
        const { purchaseInfo } = req.body;

        await prisma.purchase.update({
            data: {
                ...purchaseInfo,
                orderDate: new Date(purchaseInfo.orderDate)
            },
            where: { id: idShopping }
        });

        return res.status(200).json({
            message: "Compra actualizada exitosamente!"
        });
    } catch (error) {
        next(error);
    }
};


export const updatePurchaseStatus: RequestHandler<
    { idShopping: string },
    { message: string },
    { status: PurchasesStatus }

> = async (req, res, next) => {
    try {
        const { idShopping } = req.params;
        const { status } = req.body;

        const existShopping = prisma.purchase.findUnique({
            where: {
                id: idShopping
            }
        });

        if (!existShopping) return res.status(404).json({
            message: "No se ha encontrado la compra indicada"
        });

        await prisma.purchase.update({
            data: {
                status
            },
            where: { id: idShopping }
        });

        return res.status(200).json({
            message: "Compra actualizada exitosamente!"
        });

    } catch (error) {
        next(error);
    }
};


export const changePaymentsInfo: RequestHandler<
    { idShopping: string; },
    { message: string; },
    { purchasePayments: (Omit<PurchasePayment, "id" | "purchaseId" | "userId"> & { id?: number })[] }

> = async (req, res, next) => {
    try {
        const { idShopping } = req.params;
        const { purchasePayments } = req.body;

        for (const payment of purchasePayments) {
            console.log(payment);
            if (payment.id) {
                await prisma.purchasePayment.update({
                    data: payment,
                    where: { id: payment.id }
                });

                continue;
            }

            await prisma.purchasePayment.create({
                data: {
                    ...payment,
                    purchaseId: idShopping
                }
            });
        }

        return res.status(200).json({
            message: "Pagos actualizados correctamente"
        });
    } catch (error) {
        next(error);
    }
};


export const deletePaymentInfo: RequestHandler<{
    id: number;
}> = async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log(id);


        await prisma.purchasePayment.delete({
            where: { id: Number(id) }
        });

        res.status(200).json({
            message: "Pago eliminado correctamente."
        });
    } catch (error) {
        next(error);
    }
};


export const addVariantShopping: RequestHandler<
    { idShopping: string },
    { message: string },
    { variant: Omit<PurchaseDetail, "id" | "purchaseId"> }
> = async (req, res, next) => {
    try {
        const { idShopping } = req.params;
        const { variant } = req.body;

        const shopping = await prisma.purchase.findUnique({
            where: { id: idShopping }
        });

        if (!shopping) return res.status(404).json({ message: "No se ha encontrado la compra indicada." });

        const existVariantInShopping = await prisma.purchaseDetail.findFirst({
            where: {
                variantId: variant.variantId,
                purchaseId: idShopping
            }
        });

        console.log(existVariantInShopping);

        if (existVariantInShopping) return res.status(400).json({ message: "La talla ya existe en la compra." });


        await prisma.purchaseDetail.create({
            data: {
                ...variant,
                variantId: Number(variant.variantId),
                purchaseId: idShopping,
            }
        });


        return res.status(201).json({
            message: "Varinate agregada exitosamente a la compra."
        });
    } catch (error) {
        next(error);
    }
};


export const updateVariantInShopping: RequestHandler<
    { idShopping: string, idVariantShopping: number },
    { message: string },
    { variant: Omit<PurchaseDetail, "id" | "purchaseId"> }
> = async (req, res, next) => {
    try {
        const { idShopping, idVariantShopping } = req.params;
        const { variant } = req.body;

        const shopping = await prisma.purchase.findUnique({
            where: { id: idShopping }
        });

        if (!shopping) return res.status(404).json({ message: "No se ha encontrado la compra indicada." });

        const existVariantInShopping = prisma.purchaseDetail.findFirst({
            where: {
                variantId: idVariantShopping,
                purchaseId: idShopping
            }
        });

        if (!existVariantInShopping) return res.status(404).json({ message: "No se ha encontrado el producto en la compra." });

        await prisma.purchaseDetail.update({
            data: {
                ...variant,
                variantId: Number(variant.variantId)
            },
            where: {
                purchaseId_variantId: {
                    purchaseId: idShopping,
                    variantId: Number(idVariantShopping)
                }
            }
        });

        return res.status(200).json({
            message: "Detalle del producto actualizado exitosamente."
        });

    } catch (error) {
        next(error);
    }
};


export const deleteVariantInShopping: RequestHandler<
    { idShopping: string, idVariantShopping: number },
    { message: string }
> = async (req, res, next) => {
    try {
        const { idShopping, idVariantShopping } = req.params;

        const shopping = await prisma.purchase.findUnique({
            where: { id: idShopping }
        });

        if (!shopping) return res.status(404).json({ message: "No se ha encontrado la compra indicada." });

        const existVariantInShopping = prisma.purchaseDetail.findFirst({
            where: {
                variantId: idVariantShopping,
                purchaseId: idShopping
            }
        });

        if (!existVariantInShopping) return res.status(404).json({ message: "No se ha encontrado el producto en la compra." });


        const isOneDetail = await prisma.purchaseDetail.findMany({
            where: {
                purchaseId: idShopping
            }
        });

        if (isOneDetail.length === 1) return res.status(400).json({ message: "No se puede eliminar el producto, debe existir al menos un producto en la compra." });


        await prisma.purchaseDetail.delete({
            where: {
                purchaseId_variantId: {
                    purchaseId: idShopping,
                    variantId: Number(idVariantShopping)
                }
            }
        });

        return res.status(200).json({
            message: "Producto en la compra eliminado exitosamente."
        });

    } catch (error) {
        next(error);
    }
};

export const getProducts: RequestHandler<
    unknown,
    unknown,
    unknown,
    { search: string }
> = async (req, res, next) => {
    try {
        const { search } = req.query;

        const products = await prisma.product.findMany({
            select: {
                sku: true,
                name: true,
                id: true,
                brand: true,
                gender: true,
                productColors: {
                    select: {
                        id: true,
                        colorId: true,
                        colorImages: true,
                        color: true,
                        productVariants: {
                            select: {
                                currentStock: true,
                                productColor: true,
                                productColorId: true,
                                id: true,
                                size: true,
                            }
                        },
                    }
                }
            },
            where: {
                name: { contains: search, mode: "insensitive" }
            }
        });

        return res.status(200).json({ products });
    } catch (error) {
        next(error);
    }
};


export const getSupplier: RequestHandler<
    unknown,
    unknown,
    unknown,
    { search: string; }
> = async (req, res, next) => {
    try {
        const { search } = req.query;

        const suppliers = await prisma.supplier.findMany({
            select: {
                businessName: true,
                document: true,
            },
            where: {
                OR: [
                    {
                        businessName: {
                            contains: search,
                            mode: "insensitive"
                        }
                    },
                    {
                        document: {
                            contains: search,
                            mode: "insensitive"
                        }
                    }
                ]
            }
        });

        return res.status(200).json({
            suppliers
        });
    } catch (error) {
        next(error);
    }
};