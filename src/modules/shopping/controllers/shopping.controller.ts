import { Prisma, Purchase, PurchaseDetail } from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";


type GetShoppingByID = Prisma.PurchaseGetPayload<
    {
        select: {
            id: true,
            cashRegister: true,
            supplier: true,
            status: true,
            deliveryDate: true,
            orderDate: true,
            vat: true,
            purchaseDetails: {
                select: {
                    unitPrice: true,
                    quantity: true,
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
            cashRegister: true,
            supplier: true,
            status: true,
            deliveryDate: true,
            orderDate: true,
            vat: true,
        },
    }>

export const getShoppings: RequestHandler<
    { idShopping?: string; },
    { message: string, shoppings?: GetShopping[] | GetShoppingByID }
> = async (req, res, next) => {
    try {
        const { idShopping } = req.params;

        if (idShopping) {
            const shopping = await prisma.purchase.findUnique({
                select: {
                    id: true,
                    cashRegister: true,
                    supplier: true,
                    status: true,
                    deliveryDate: true,
                    vat: true,
                    orderDate: true,
                    purchaseDetails: {
                        select: {
                            unitPrice: true,
                            quantity: true,
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
                cashRegister: true,
                supplier: true,
                status: true,
                deliveryDate: true,
                orderDate: true,
                vat: true,
            },
        });

        return res.status(200).json({
            message: "Compras obtenidas exitosamente",
            shoppings: shoppings
        });

    } catch (error) {
        next(error);
    }
};



export const createShopping: RequestHandler<
    unknown,
    { message: string },
    { purchaseInfo: Omit<Purchase, 'status' | 'deliveryDate'>, purchaseDetails: Omit<PurchaseDetail, 'id' | "purchaseId">[] }
> = async (req, res, next) => {
    try {
        const { purchaseInfo, purchaseDetails } = req.body;


        if (purchaseDetails.length === 0 || !purchaseInfo) return res.status(400).json({
            message: "Campos por llenar"
        });

        await prisma.$transaction(async (tx) => {
            const insertedPurchase = await tx.purchase.create({
                data: purchaseInfo
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