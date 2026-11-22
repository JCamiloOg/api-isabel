import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";
import { Prisma } from "@prisma/client";
import { getTotalSale } from "../../../utils/sumItems.js";


type OrdersPayload = Prisma.SaleGetPayload<{
    select: {
        customer: {
            select: {
                identityDocument: true,
                firstName: true,
                lastName: true,
            }
        },
        id: true,
        status: true,
        vat: true,
    },
}> & { total: number; };


type OrdersPayloadByID = Prisma.SaleGetPayload<{
    omit: {
        isDirectSale: true,
        isCredit: true,
        customerId: true,
    },
    include: {
        customer: {
            select: {
                identityDocument: true,
                firstName: true,
                lastName: true,
            }
        },
        saleDetails: {
            include: {
                variant: {
                    include: {
                        size: true
                        productColor: {
                            include: {
                                color: true,
                                product: true,
                                colorImages: true,
                            }
                        }
                    }
                }
            }
        },
    },
}>;


export const getOrders: RequestHandler<
    { idOrder?: string },
    { message: string, orders?: OrdersPayload[] | OrdersPayloadByID }
> = async (req, res, next) => {
    try {
        const { idOrder } = req.params;

        if (idOrder) {
            const order = await prisma.sale.findUnique({
                omit: {
                    isDirectSale: true,
                    isCredit: true,
                    customerId: true,
                },
                include: {
                    customer: {
                        select: {
                            identityDocument: true,
                            firstName: true,
                            lastName: true,
                        }
                    },
                    saleDetails: {
                        include: {
                            variant: {
                                include: {
                                    size: true,
                                    productColor: {
                                        include: {
                                            color: true,
                                            product: true,
                                            colorImages: true,
                                        }
                                    }
                                }
                            }
                        }

                    },
                },
                where: {
                    id: idOrder
                }
            });

            if (!order) return res.status(404).json({ message: "No se encontró ningún pedido." });

            return res.status(200).json({
                message: "Pedido obtenido exitosamente",
                orders: order
            });
        }


        const orders = await prisma.sale.findMany({
            select: {
                customer: {
                    select: {
                        identityDocument: true,
                        firstName: true,
                        lastName: true,
                    }
                },
                id: true,
                status: true,
                vat: true,
            },
            orderBy: {
                saleDate: "desc"
            },
            where: { isDirectSale: false }
        });

        const ordersWithTotal = await Promise.all(orders.map(async (order) => ({
            ...order,
            total: await getTotalSale(order.id, order.vat.toNumber())
        })));

        return res.status(200).json({
            message: "Pedidos obtenidos exitosamente.",
            orders: ordersWithTotal
        });
    } catch (error) {
        next(error);
    }
};



export const updateStatusOrder: RequestHandler<
    { idOrder: string; },
    { message: string },
    { status: string; }
> = async (req, res, next) => {
    try {
        const { idOrder } = req.params;
        const { status } = req.body;

        if (!idOrder) return res.status(401).json({
            message: "No se ha indicado el # de pedido"
        });

        const order = await prisma.sale.findUnique({
            where: { id: idOrder }
        });

        if (!order) res.status(404).json({ message: "No se encontró ningún pedido." });

        await prisma.sale.update({
            data: {
                status
            },
            where: {
                id: idOrder
            }
        });

        return res.status(200).json({
            message: "Estado del pedido actualizado correctamente."
        });
    } catch (error) {
        next(error);
    }
};