import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";
import { Prisma, SaleReturn } from "@prisma/client";


type SaleReturnByIDPayload = Prisma.SaleReturnGetPayload<{
    select: {
        id: true,
        sale: true,
        quantity: true,
        user: true,
        reason: true,
        rejectionReason: true,
        requestDate: true,
        resolutionDate: true,
        status: true,
        variant: {
            select: {
                size: true,
                productColor: {
                    select: {
                        colorImages: true,
                        color: true,
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                            }
                        }
                    }
                }
            }
        }
    },
}
>

type SaleReturnsPayload = Prisma.SaleReturnGetPayload<{
    select: {
        id: true,
        sale: true,
        quantity: true,
        reason: true,
        requestDate: true,
        status: true,
        variant: {
            select: {
                size: true,
                productColor: {
                    select: {
                        colorImages: true,
                        color: true,
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                            }
                        }
                    }
                }
            }
        }

    }
}>

export const getSalesReturns: RequestHandler<
    { idSaleReturn: string; },
    { message: string, saleReturns?: SaleReturnsPayload[] | SaleReturnByIDPayload }
> = async (req, res, next) => {
    try {
        const { idSaleReturn } = req.params;

        if (idSaleReturn) {
            const saleReturn = await prisma.saleReturn.findUnique({
                select: {
                    id: true,
                    sale: {
                        include: {
                            customer: true,
                            seller: true,
                        }
                    },
                    quantity: true,
                    user: true,
                    reason: true,
                    rejectionReason: true,
                    requestDate: true,
                    resolutionDate: true,
                    status: true,
                    variant: {
                        select: {
                            size: true,
                            productColor: {
                                select: {
                                    colorImages: true,
                                    color: true,
                                    product: {
                                        select: {
                                            id: true,
                                            name: true,
                                            sku: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                where: { id: idSaleReturn }
            });

            if (!saleReturn) return res.status(404).json({ message: "Devolución no encontrada." });

            return res.status(200).json({
                message: "Devolución obtenida exitosamente.",
                saleReturns: saleReturn
            });
        }

        const saleReturns = await prisma.saleReturn.findMany({
            select: {
                id: true,
                sale: true,
                quantity: true,
                reason: true,
                requestDate: true,
                status: true,
                variant: {
                    select: {
                        size: true,
                        productColor: {
                            select: {
                                colorImages: true,
                                color: true,
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                        sku: true,
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                requestDate: "desc"
            }
        });

        return res.status(200).json({
            message: "Devoluciones obtenidas existosamente.",
            saleReturns
        });

    } catch (error) {
        next(error);
    }
};


export const createSaleReturn: RequestHandler<
    unknown,
    { message: string },
    { saleReturn: Omit<SaleReturn, "id" | "rejectionReason" | "status" | "resolutionDate" | "userId"> }
> = async (req, res, next) => {
    try {
        const { saleReturn } = req.body;

        if (!saleReturn) return res.status(400).json({
            message: "No se han enviado datos."
        });



        await prisma.saleReturn.create({
            data: {
                ...saleReturn,
                userId: "1017100002"
            }
        });

        return res.status(201).json({
            message: `Devolución de la venta ${saleReturn.saleId.split("-")[0]}... creada existosamente.`
        });
    } catch (error) {
        next(error);
    }
};


export const resolveSaleReturn: RequestHandler<
    { idSaleReturn: string; },
    { message: string; },
    { status: "Aprobada" | "Rechazada", rejectReason?: string }
> = async (req, res, next) => {
    try {
        const { idSaleReturn } = req.params;
        const { status, rejectReason } = req.body;

        if (status === "Rechazada" && !rejectReason) return res.status(400).json({
            message: "Debes ingresar el motivo del rechazo."
        });

        await prisma.saleReturn.update({
            data: {
                resolutionDate: new Date(),
                status,
                rejectionReason: rejectReason ?? ""
            },
            where: { id: idSaleReturn }
        });

        return res.status(200).json({ message: `Devolución ${status} existosamente` });
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
    } catch (error) {
        next(error);
    }
};

